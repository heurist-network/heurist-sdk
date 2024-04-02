import { readEnv } from "../lib";
import { Images } from "../images";
import * as API from "../apis";

export interface ClientOptions {
  /**
   * Defaults to process.env['HEURIST_BASE_URL'].
   */
  baseURL?: string | null | undefined;

  /**
   * Defaults to process.env['HEURIST_API_KEY'].
   */
  apiKey?: string | undefined;
}

export class Heurist {
  baseURL: string;
  apiKey: string;

  constructor({
    baseURL = readEnv("HEURIST_BASE_URL"),
    apiKey = readEnv("HEURIST_API_KEY"),
  }: ClientOptions = {}) {
    if (apiKey === undefined) {
      throw new Error(
        "The HEURIST_API_KEY environment variable is missing or empty; either provide it, or instantiate the Heurist client with an apiKey option, like new Heurist({ apiKey: 'My API Key' })."
      );
    }

    this.baseURL = baseURL || "http://sequencer.heurist.xyz";
    this.apiKey = apiKey;
  }

  images: API.Images = new Images(this);
}

export default Heurist;
