import * as CompletionsAPI from 'heurist/chat/completions'
import { APIResource } from 'heurist/resource'

export class Chat extends APIResource {
  completions: CompletionsAPI.Completions = new CompletionsAPI.Completions(
    this._client,
  )
}
