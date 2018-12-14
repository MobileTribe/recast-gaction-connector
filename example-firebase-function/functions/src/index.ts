import * as functions from 'firebase-functions';
import {BotConnector} from "recast-gaction-connector";
import {Request, Response} from "express"
import * as admin from "firebase-admin";

admin.initializeApp(functions.config().firebase);

let cachedConnectors: BotConnector[];

function loadConnector(botToken: string, forceReload: boolean = false): Promise<BotConnector> {

    if (cachedConnectors == null || forceReload) {
        return loadConnectors()
            .then(connectors => {
                return connectors.find(connector => connector.recastBotToken === botToken);
            });
    } else {
        let connector = cachedConnectors.find(connector => connector.recastBotToken === botToken);
        if (connector == null) {
            return loadConnector(botToken, true)
        } else {
            return Promise.resolve(connector)
        }
    }

}

function loadConnectors(): Promise<BotConnector[]> {
    return admin.database().ref("/connectors")
        .once("value")
        .then(data => {
            let connectors: BotConnector[] = [];
            data.forEach(connector => {
                connectors.push(new BotConnector(connector.val()));
                return false;
            });
            console.log(connectors.length + " connectors loaded");
            cachedConnectors = connectors;
            return connectors
        });
}


export const recast = functions.https.onRequest((request: Request, response: Response) => {
    const botToken = request.query.botToken;
    loadConnector(botToken)
        .then(value => {
            if (value != null) {
                return Promise.resolve(value);
            } else {
                return Promise.reject("connector not found");
            }
        })
        .then(connector => {
            return connector.handleRequest(request, response);
        })
        .catch(reason => {
            console.error(reason);
            return response.sendStatus(404);
        });


});
