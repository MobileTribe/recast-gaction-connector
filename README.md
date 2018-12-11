# recast-gaction-connector

[![npm version](https://badge.fury.io/js/recast-gaction-connector.svg)](https://www.npmjs.com/recast-gaction-connector)
[![Apache License 2](http://img.shields.io/badge/license-ASF2-blue.svg)](http://www.apache.org/licenses/LICENSE-2.0.txt)

## Note

recast-gaction-connector is a npm library to help you connect your recast.ai bot to google action.

## Get started

```typescript
import {BotConnector} from "recast-gaction-connector"

let botConnector = new BotConnector({
    //needed if you want to connect your user
     gActionClientId: "", 
     //token to access your recast bot
     recastBotToken: "",
     //if true the connector will handle the request to go to the smartphone if you want to display a card
     autoChangeSurface: true,
     //error message if an error append (if empty it close the conversation)
     defaultErrorMessages: {"fr-FR": "Je n'ai pas compris. Pouvez-vous répéter ?"}, 
     //if you want to override default google voice
     voiceConfig: {
         shortPunctuationMs: 2000,
         longPunctuationMs: 4000,
         rate: "2st",
         pitch: '200%'
     }
 });

//...
function onRequest(req: Request, resp: Response){
    return botConnector.handleRequest(req, resp)
}



```

## Changelog

### *1.0.0* - (2018-12-10)
*Feature*
- Map all type of recast response to google action

### *1.0.1* - (2018-12-10)
*Fix*
- Changelog
- Connector defaultErrorMessages config


## Partner

![](https://github.com/MobileTribe/recast-gaction-connector/blob/master/doc/partners/lm.jpg =120,120)

## License

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
