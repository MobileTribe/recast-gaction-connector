import {
    actionssdk,
    ActionsSdkConversation,
    BasicCard,
    BrowseCarousel,
    BrowseCarouselItem,
    Button,
    Image,
    List,
    NewSurface,
    Response as GoogleResponse,
    SimpleResponse,
    Suggestions
} from "actions-on-google";
import RecastClient from "recastai"
import {Request, Response} from "express"

export class VoiceConfig {
    pitch: string = "0st";
    rate: string = "100%";
    longPunctuationMs: number = 400;
    shortPunctuationMs: number = 200;
}

export interface BotConnectorOptions {
    gActionClientId: string,
    debug?: boolean,
    recastBotToken?: string,
    autoChangeSurface?: boolean,
    pauseBetweenMessages: boolean,
    defaultErrorMessages?: { [key: string]: string }
    voiceConfig?: VoiceConfig
}

export class BotConnector {

    static MEMORY_INTENT = "GOOGLE_INTENT";
    static MEMORY_MEDIA_STATUS = "MEDIA_STATUS";
    static MEMORY_SCREEN_CAPACITY = "SCREEN_CAPACITY";
    static MEMORY_CLOSE_CONVERSATION = "CLOSE_CONVERSATION";
    static MEMORY_CHANGE_SURFACE_MESSAGES = "MEMORY_CHANGE_SURFACE_MESSAGES";

    private actionsApp;
    recastBotToken: string;
    defaultErrorMessages: { [key: string]: string };
    debug: boolean;
    autoChangeSurface: boolean;
    pauseBetweenMessages: boolean;
    voiceConfig: VoiceConfig;

    public constructor(options: BotConnectorOptions) {
        this.actionsApp = actionssdk({
            clientId: options.gActionClientId,
            debug: options.debug
        });
        this.pauseBetweenMessages = options.pauseBetweenMessages;
        this.defaultErrorMessages = options.defaultErrorMessages;
        this.recastBotToken = options.recastBotToken;
        this.debug = options.debug;
        this.autoChangeSurface = options.autoChangeSurface;
        this.actionsApp.fallback((conv: ActionsSdkConversation) => {
            this.updateConversationIntent(conv);
            return this.handleGoogleConversation(conv);
        });
        this.voiceConfig = options.voiceConfig;
        if (this.voiceConfig === undefined) {
            this.voiceConfig = new VoiceConfig()
        }


        this.actionsApp.intent('actions.intent.MAIN', (conv: ActionsSdkConversation) => {
            if (conv.arguments && conv.arguments.parsed && conv.arguments.parsed.input && conv.arguments.parsed.input['is_health_check'] === true) {
                if (this.debug) {
                    console.log("Google Crawler detected");
                }
                conv.ask(new SimpleResponse("Hi, Google Crawler"));
                return Promise.resolve(conv)
            } else {
                this.updateConversationIntent(conv);
                return this.handleGoogleConversation(conv);
            }
        });

        this.actionsApp.intent('actions.intent.NEW_SURFACE', (conv, input, newSurface) => {
            this.updateConversationIntent(conv);
            if (newSurface.status === 'OK') {
                if (conv.user.storage[BotConnector.MEMORY_CHANGE_SURFACE_MESSAGES]) {
                    conv.ask(this.parseRecastResponses(conv.user.storage[BotConnector.MEMORY_CHANGE_SURFACE_MESSAGES], conv));
                    return Promise.resolve()
                } else {
                    return this.handleGoogleConversation(conv);
                }
            }
            else {
                return this.handleGoogleConversation(conv);
            }
        });
    }


    public handleRequest(req: Request, resp: Response) {
        return this.actionsApp(req, resp)
    }


    protected updateConversationIntent(conv: ActionsSdkConversation) {
        conv.user.storage[BotConnector.MEMORY_INTENT] = conv.intent;
        conv.user.storage[BotConnector.MEMORY_SCREEN_CAPACITY] = conv.screen;
        conv.user.storage[BotConnector.MEMORY_CLOSE_CONVERSATION] = conv.intent === "actions.intent.CANCEL";

        const mediaStatus = conv.arguments.get('MEDIA_STATUS');
        if (mediaStatus) {
            conv.user.storage[BotConnector.MEMORY_MEDIA_STATUS] = mediaStatus;
        } else {
            delete conv.user.storage[BotConnector.MEMORY_MEDIA_STATUS];
        }
    }


    protected handleGoogleConversation(conv: ActionsSdkConversation): Promise<ActionsSdkConversation> {

        if (this.debug) {
            console.log("handleGoogleConversation", conv.input.raw, "conversationId : ", conv.body.conversation.conversationId);
        }
        let recastInputText = conv.input.raw;
        let recastClient = new RecastClient(this.recastBotToken, conv.user.locale.split("-")[0]) as any;

        let recastSentMemory = {};
        for (let prop in conv.user.storage) {
            recastSentMemory[prop] = conv.user.storage[prop];
        }
        return recastClient.build.dialog({'type': 'text', content: recastInputText},
            {conversationId: conv.id}, recastSentMemory)
            .then(result => {
                if (this.debug) {
                    console.log("received recast dialog : ", JSON.stringify(result));
                }
                let shouldCloseConversation = result.conversation.memory[BotConnector.MEMORY_CLOSE_CONVERSATION] === true;


                conv.user.storage = {};
                for (let prop in result.conversation.memory) {
                    if (result.conversation.memory.hasOwnProperty(prop)) {
                        conv.user.storage[prop] = result.conversation.memory[prop];
                    }
                }
                let googleAssistantAnswers = this.parseRecastResponses(result.messages, conv);

                if (googleAssistantAnswers.length === 0) {
                    throw new Error("recast response empty");
                }

                if (this.debug) {

                    console.log("converted google response", JSON.stringify(googleAssistantAnswers));
                    console.log("memory", JSON.stringify(conv.user.storage));
                }

                googleAssistantAnswers.forEach((r, index) => {
                    if (index === googleAssistantAnswers.length - 1 && shouldCloseConversation
                    ) {
                        conv.close(r); //conv.close(r);
                    }
                    else {
                        conv.ask(r);
                    }

                });
                return conv;

            }).catch(err => {
                console.error("Recastai went wrong: ", err);
                if (this.defaultErrorMessages && this.defaultErrorMessages[conv.user.locale]) {
                    conv.ask(new SimpleResponse(this.textToGoogleSpeech(this.defaultErrorMessages[conv.user.locale])));
                } else {
                    conv.close()
                }
                return conv;
            });
    }

    protected parseRecastResponses(responses: any[], conv: ActionsSdkConversation): GoogleResponse[] {

        //group recast responses
        for (let i = responses.length - 1; i >= 1; i--) {
            if (responses[i].type === "text" && responses[i].type === responses[i - 1].type) {
                let separator = this.pauseBetweenMessages ? "<break time='1000ms'/>\n" : " ";
                responses[i - 1].content = responses[i - 1].content + separator + responses[i].content
                responses.splice(i, 1)
            }
        }

        //convert
        let googleResponses = [];
        for (let i = 0; i < responses.length; i++) {
            let response = responses[i];
            switch (response.type) {
                case "buttons":
                case "quickReplies":
                    googleResponses.push(new SimpleResponse(this.textToGoogleSpeech(response.content.title)));
                    response.content.buttons.forEach(recastButton => {
                        googleResponses.push(new Suggestions(recastButton.title));
                    });
                    break;
                case "carousel":
                    let googleBrowseCarrousselItems = [];
                    response.content.forEach(recastListItem => {
                        googleBrowseCarrousselItems.push(new BrowseCarouselItem({
                            title: recastListItem.title,
                            url: recastListItem.buttons.length > 0 ? recastListItem.buttons[0].value : null,
                            description: recastListItem.subtitle,
                            image: new Image({
                                url: recastListItem.imageUrl,
                                alt: "image",
                            }),
                            footer: null
                        }));
                    });
                    googleResponses.push(new BrowseCarousel({items: googleBrowseCarrousselItems}));
                    break;
                case "list":
                    let listItems = [];
                    response.content.elements.forEach( recastListItem => {
                        var listItem = { 
                            title: recastListItem.title || ( recastListItem.buttons[ 0 ] ? recastListItem.buttons[ 0 ].title : "" ),
                            description: recastListItem.subtitle,
                            image: recastListItem.imageUrl ? new Image({
                                url: recastListItem.imageUrl,
                                alt: "image",
                            }) : null,
                            optionInfo: {
                                key: "",
                                synonyms: []
                            } 
                        };
                        listItem.optionInfo.key = ( recastListItem.buttons[ 0 ] ? recastListItem.buttons[ 0 ].value : "" ) || listItem.title;
                        listItems.push( listItem );
                    });
                    googleResponses.push(new List({items: listItems}));
                    break;
                case "card":
                case "picture":
                    let cardData;
                    if (response.type == "picture") {
                        cardData = {
                            imageUrl: response.content,
                        }
                    } else {
                        let recastButton = response.content.buttons[0];
                        cardData = {
                            title: response.content.title,
                            subtitle: response.content.subtitle,
                            imageUrl: response.content.imageUrl,
                            buttonTitle: recastButton ? recastButton.title : null,
                            buttonUrl: recastButton ? recastButton.value : null,
                        };
                    }

                    if (!conv.screen) {

                        if (this.autoChangeSurface) {
                            if (conv.available && conv.available.surfaces && conv.available.surfaces.capabilities.has("actions.capability.SCREEN_OUTPUT")) {
                                if (this.debug) {
                                    console.log("request newsurface");
                                }
                                conv.user.storage[BotConnector.MEMORY_CHANGE_SURFACE_MESSAGES] = responses.slice(i, responses.length);
                                googleResponses.push(new NewSurface({
                                    context: cardData.title,
                                    notification: cardData.title,
                                    capabilities: ['actions.capability.SCREEN_OUTPUT']
                                }));

                            } else {
                                console.warn("card ignored, screen not available and autoChangeSurface is false")
                            }
                        }

                    } else {
                        let gcard = new BasicCard({
                            title: cardData.title,
                            subtitle: cardData.subtitle,
                            image: new Image({
                                url: cardData.imageUrl,
                                alt: 'image'
                            }),
                            buttons: []
                        });

                        if (cardData.buttonTitle) {
                            gcard.buttons.push(new Button({title: cardData.buttonTitle, url: cardData.buttonUrl}));
                        }
                        googleResponses.push(gcard);

                    }
                    break;
                case "text":
                default:
                    googleResponses.push(new SimpleResponse({
                        speech: this.textToGoogleSpeech(response.content)
                    }));
                    break;
            }

        }

        return googleResponses;

    }


    private static longPunctuationRegexp = new RegExp(/([.?!:\u2026]+\s)/g);
    private static shortPunctuationRegexp = new RegExp(/([,;]\s)/g);


    protected textToGoogleSpeech(text: string): string {

        let withBreaks = text.replace(BotConnector.longPunctuationRegexp, "$1<break time='" + this.voiceConfig.longPunctuationMs + "ms'/>")
            .replace(BotConnector.shortPunctuationRegexp, "$1<break time='" + this.voiceConfig.shortPunctuationMs + "ms'/>");

        return "<speak><prosody pitch='" + this.voiceConfig.pitch + "' rate='" + this.voiceConfig.rate + "'>" +
            withBreaks +
            "</prosody></speak>";

    }


}