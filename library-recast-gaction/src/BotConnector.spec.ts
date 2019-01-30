import {suite, test} from "mocha-typescript";

import {BotConnector} from "./BotConnector";
import * as assert from "assert";
import {ActionsSdkConversation, BasicCard, BrowseCarousel, List, SimpleResponse, Suggestions} from "actions-on-google";


@suite("ClassA test suite")
class BotConnectorSuite extends BotConnector {
    private testActionConv: ActionsSdkConversation<{}, {}>;

    constructor() {
        super({
            gActionClientId: "",
            recastBotToken: "",
            autoChangeSurface: true,
            pauseBetweenMessages: true,
            defaultErrorMessages: {"fr-FR": "Je n'ai pas compris. Pouvez-vous répéter ?"},
            voiceConfig: {
                shortPunctuationMs: 2000,
                longPunctuationMs: 4000,
                rate: "200%",
                pitch: '2st'
            }
        });

        this.testActionConv = new ActionsSdkConversation();
        this.testActionConv.user.locale = "fr-FR";
        this.testActionConv.input.raw = "bonjour";
        this.testActionConv.id = "10000";
        this.testActionConv.screen = true;
    }

    @test
    "Text converted to voice format should contain voice config"() {
        assert.equal(this.textToGoogleSpeech("Bonjour. comment, ça va ?"),
            "<speak><prosody pitch='" + this.voiceConfig.pitch + "'" +
            " rate='" + this.voiceConfig.rate + "'>Bonjour. <break time='" + this.voiceConfig.longPunctuationMs + "ms'/>" +
            "comment, <break time='" + this.voiceConfig.shortPunctuationMs + "ms'/>ça va ?</prosody></speak>");

    }


    @test
    "Text response should be merged in google format"() {
        let testActionConv = new ActionsSdkConversation();
        let recastMessages = [
            BotConnectorSuite.RECAST_FORMAT_TEXT,
            {"type": "text", "content": "text2"}
        ];

        let result = this.parseRecastResponses(recastMessages, this.testActionConv);

        //message are merged
        assert.equal(result.length, 1);

        recastMessages.forEach(recastMessage => {
            let textToSpeech = (result[0] as any).textToSpeech;
            let index = textToSpeech.indexOf(recastMessage.content);
            assert(index >= 0)
        });
    }


    @test
    "Recast text should be converted to SimpleResponse"() {
        assert(this.parseRecastResponses([BotConnectorSuite.RECAST_FORMAT_TEXT], this.testActionConv)[0] instanceof SimpleResponse);
    }

    @test
    "Recast quickReplies should be converted to SimpleResponse and Suggestions"() {
        let response = this.parseRecastResponses([BotConnectorSuite.RECAST_FORMAT_QUICKREPLIES], this.testActionConv);
        assert(response[0] instanceof SimpleResponse);
        assert(response[1] instanceof Suggestions);
    }

    @test
    "Recast card should be converted to BasicCard"() {
        let response = this.parseRecastResponses([BotConnectorSuite.RECAST_FORMAT_CARD], this.testActionConv);
        assert(response[0] instanceof BasicCard);
    }

    @test
    "Recast buttons should be converted to SimpleResponse and Suggestions"() {
        let response = this.parseRecastResponses([BotConnectorSuite.RECAST_FORMAT_BUTTONS], this.testActionConv);
        assert(response[0] instanceof SimpleResponse);
        assert(response[1] instanceof Suggestions);
    }

    @test
    "Recast list should be converted to List"() {
        let response = this.parseRecastResponses([BotConnectorSuite.RECAST_FORMAT_LIST], this.testActionConv);
        assert(response[0] instanceof List);
    }

    @test
    "Recast carousel should be converted to BrowseCarousel"() {
        let response = this.parseRecastResponses([BotConnectorSuite.RECAST_FORMAT_CAROUSEL], this.testActionConv);
        assert(response[0] instanceof BrowseCarousel);
    }

    @test
    "Recast image should be converted to BasicCard"() {
        let response = this.parseRecastResponses([BotConnectorSuite.RECAST_FORMAT_PICTURE], this.testActionConv);
        assert(response[0] instanceof BasicCard);
    }


    static RECAST_FORMAT_TEXT = {
        "type": "text",
        "content": "MY_TEXT"
    };
    static RECAST_FORMAT_QUICKREPLIES = {
        "type": "quickReplies",
        "content": {
            "title": "TITLE",
            "buttons": [
                {
                    "title": "BUTTON_TITLE",
                    "value": "BUTTON_VALUE"
                }
            ]
        }
    };
    static RECAST_FORMAT_CARD = {
        "type": "card",
        "content": {
            "title": "CARD_TITLE",
            "subtitle": "CARD_SUBTITLE",
            "imageUrl": "IMAGE_URL",
            "buttons": [
                {
                    "title": "BUTTON_TITLE",
                    "type": "BUTTON_TYPE",
                    "value": "BUTTON_VALUE"
                }
            ]
        }
    };
    static RECAST_FORMAT_BUTTONS = {
        "type": "buttons",
        "content": {
            "title": "BUTTON_TITLE",
            "buttons": [
                {
                    "title": "BUTTON_TITLE",
                    "type": "BUTTON_TYPE",
                    "value": "BUTTON_VALUE"
                }
            ]
        }
    };
    static RECAST_FORMAT_CAROUSEL = {
        "type": "carousel",
        "content": [
            {
                "title": "CARD_1_TITLE",
                "subtitle": "CARD_1_SUBTITLE",
                "imageUrl": "IMAGE_URL",
                "buttons": [
                    {
                        "title": "BUTTON_1_TITLE",
                        "type": "BUTTON_1_TYPE",
                        "value": "BUTTON_1_VALUE"
                    }
                ]
            }
        ]
    };
    static RECAST_FORMAT_LIST = {
        "type": "list",
        "content": {
            "elements": [
                {
                    "title": "ELEM_1_TITLE",
                    "imageUrl": "IMAGE_URL",
                    "subtitle": "ELEM_1_SUBTITLE",
                    "buttons": [
                        {
                            "title": "BUTTON_1_TITLE",
                            "type": "BUTTON_TYPE",
                            "value": "BUTTON_1_VALUE"
                        }
                    ]
                }
            ],
            "buttons": [
                {
                    "title": "BUTTON_1_TITLE",
                    "type": "BUTTON_TYPE",
                    "value": "BUTTON_1_VALUE"
                }
            ]
        }
    };
    static RECAST_FORMAT_PICTURE = {
        "type": "picture",
        "content": "IMAGE_URL",
    };


}

//
// describe('My math library', () => {
//
//
//     let testActionConv = new ActionsSdkConversation();
//     testActionConv.user.locale = "fr-FR";
//     testActionConv.input.raw = "bonjour";
//     testActionConv.id = "10000";
//
//     let bot = new BotConnector();
//
//     it('should be able to add things correctly', () => {
//         bot.textToGoogleSpeech(testActionConv).then(value => {
//             console.log(value);
//             expect(value).to.equal("");
//         });
//     });
//
// });