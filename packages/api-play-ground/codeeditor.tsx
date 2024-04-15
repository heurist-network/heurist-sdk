import React from 'react';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/theme-monokai';
import axios from 'axios';

export const executeCode = async (code: string, languageId: string) => {
    const options = {
        method: 'POST',
        url: 'https://online-code-compiler.p.rapidapi.com/v1/',
        headers: {
          'content-type': 'application/json',
          'X-RapidAPI-Key': '12c73ecfbbmsh04ab80d025b5b44p158c7ajsna3f4b321e4d6',
          'X-RapidAPI-Host': 'online-code-compiler.p.rapidapi.com'
        },
        data: {
          language: 'nodejs',
          version: 'latest',
          code: code,
          input: null
        }
      };
      
      try {
          const response = await axios.request(options);
          console.log(response.data.output);
          return response.data.output
      } catch (error) {
          console.error(error);
      }
};
const Editor: React.FC<{
    mode: string;
    theme: string;
    value: string;
    onChange: (newValue: string) => void;
    onExecute: () => void;
    loading:boolean;
}> = ({ mode, theme, value, onChange, onExecute, loading }) => {
    return (
        <div style={{ width: "100%" }}>
             <div>
      {loading ? (<button
        // onClick={onExecute}
        disabled
        style={{
          padding: "10px",
          marginBottom: "10px",
          backgroundColor: "grey",
          borderRadius: "5px",
          color: "white"
        }}
      >
        Executing..
      </button>):(
      <button
        onClick={onExecute}
        style={{
          padding: "10px",
          marginBottom: "10px",
          backgroundColor: "black",
          borderRadius: "5px",
          color: "white"
        }}
      >
        Execute
      </button>)}
    </div>
            <AceEditor
                mode={mode}
                theme={theme}
                value={value}
                onChange={onChange}
                fontSize={14}
                width="100%"
                height="600px"
                style={{borderRadius:"10px"}}
            />

        </div>
    );
};

export default Editor;
