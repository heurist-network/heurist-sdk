import { useState } from "react";
import styles from "./counters.module.css";
import Heurist from "heurist";

const heurist = new Heurist({
  baseURL: "asf",
  apiKey: "asfasfasf",
});

function MyButton() {
  const [count, setCount] = useState(0);

  function handleClick() {
    setCount(count + 1);
    heurist.images.generate({
      model: "dall-e-2",
    });
  }

  return (
    <div>
      <button onClick={handleClick} className={styles.counter}>
        Clicked {count} times
      </button>
    </div>
  );
}

export default function MyApp() {
  return <MyButton />;
}
