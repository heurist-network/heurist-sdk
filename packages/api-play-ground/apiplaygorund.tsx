import Image from "next/image";
import { SetStateAction, useState } from "react";
import Editor, { executeCode } from "./codeeditor";
import { VM } from 'vm2';
import Terminal from "./terminal";

export default function ApiPlayGround() {
  const [code, setCode] = useState(`import Heurist from 'heurist'
 
  const heurist = new Heurist({
    apiKey: process.env['HEURIST_API_KEY'], // This is the default and can be omitted
  })
   
  async function main() {
    const response = await heurist.images.generate({
      model: 'BrainDance',
    })
   
    // response
    // {
    //   url: 'https://heurist-images.s3.us-east-1.amazonaws.com/**********.png',
    //   model: 'BrainDance',
    //   prompt: 'xxxxxx',
    //   ...
    // }
  }
   
  main()`);
  const [output, setOutput] = useState<string>('');
  const [isLoading, setIsLoading]=useState<boolean>(false)

  const handleChange = (newCode: SetStateAction<string>) => {
    setCode(newCode);
  };
  const handleExecute = async () => {
    setIsLoading(true)
    const output=await executeCode(code.toString(), "nodejs")
    setIsLoading(false)
    setOutput(output)
  };
  return (
    <main  style={{display:"flex", padding:"10px",gap:"10px"}}>
      <Editor
        mode="javascript"
        theme="monokai"
        value={code}
        onChange={handleChange}
        onExecute={handleExecute}
        loading={isLoading}
      />
      <Terminal output={output} />
    </main>
  );
}
