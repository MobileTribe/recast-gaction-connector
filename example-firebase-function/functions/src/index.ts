import * as functions from 'firebase-functions';
import {BotConnector} from "recast-gaction-connector";
import {Request, Response} from "express"

let connectors: BotConnector[] = [];


export const updateConnectors = functions.database.ref('/connectors')
    .onUpdate((snapshot, context) => {
        // Grab the current value of what was written to the Realtime Database.
        connectors = [];
        console.log("update connectors");
        snapshot.after.forEach(connector => {
            connectors.push(new BotConnector(connector.val()));
            return false;
        });
        console.log("connectors count " + connectors.length);


    });

export const recast = functions.https.onRequest((request: Request, response: Response) => {
    console.log("connectors count " + connectors.length);
    const botToken = request.query.botToken;
    const connector = connectors.find(connector => connector.recastBotToken === botToken);
    if (connector) {
        connector.handleRequest(request, response)
    } else {
        response.sendStatus(404);
        console.log("connector not found. Please configure - " + botToken);
    }
});
