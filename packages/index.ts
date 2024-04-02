import HeuristCore from "./core";
import * as API from "./apis";

export namespace Heurist {
  export import Image = API.Image;
  export import ImageGenerateParams = API.ImageGenerateParams;
  export import ImagesResponse = API.ImagesResponse;
  export import Images = API.Images;
}

export default HeuristCore;
