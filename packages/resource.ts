import Heurist from './core'

export class APIResource {
  protected _client: Heurist

  constructor(client: Heurist) {
    this._client = client
  }
}
