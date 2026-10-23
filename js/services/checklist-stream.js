import {subscribeQueue} from './queue-stream.js';
export const subscribeChecklists=options=>subscribeQueue({...options,path:'checklist-stream'});
