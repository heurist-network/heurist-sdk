import Heurist from './index'

export class APIResource {
  protected _client: Heurist

  constructor(client: Heurist) {
    this._client = client
  }
}
