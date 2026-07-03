import { motion } from "framer-motion";
import { Mic } from "lucide-react";
import React, { useState} from 'react';
import { toast } from 'react-toastify';
import {evaluate} from 'mathjs'

export const Calculator = () => {
  const [expression, setExpression] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const handleClear = () => {
    setExpression("");
  };

  function handleCalculate(){
    try {
      setExpression(evaluate(expression));
    } catch (error) {
      toast("Enter Correctly")
      console.log(error)
    }
  }

  function editHandle(e){
    if(e.key==="Enter"){
      handleCalculate();
    }
  }

  function speak(){

             var speech = true;
            const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.interimResults = true;
    
                recognition.addEventListener('result', e=>{
                        const transcript = Array.from(e.results).map(result =>result[0]).map(result => result.transcript)
                        setExpression(expression+transcript[0]);
                })
    
        if(speech === true){
            recognition.start();
            }
  }


  const handleButtonClick = (value) => {
    if (expression === "Error") {
      setExpression(value);
    } else {
      setExpression(prev => prev + value);
    }
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => setIsDragging(false)}
      className="absolute top-20 right-4 w-64 bg-secondary/95 backdrop-blur-md rounded-xl border border-gray-800 shadow-lg overflow-hidden"
      style={{ zIndex: isDragging ? 100 : 100 }}
    >
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between bg-gray-900/50 rounded-lg py-2">
          <input
            type="text"
            value={expression}
            onChange={(e)=> setExpression(e.target.value) }
            onKeyDown={(e)=> editHandle(e)}
            className="bg-transparent text-white text-right flex-1 outline-none w-5/6"
          />
          <Mic className="w-11 h-11 text-primary p-3" 
               onClick={speak}
          />
        </div>

        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={handleClear}
            className="col-span-2 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition-colors"
          >
            Clear
          </button>
          <button
            onClick={() => handleButtonClick("/")}
            className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg transition-colors"
          >
            ÷
          </button>
          <button
            onClick={() => handleButtonClick("*")}
            className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg transition-colors"
          >
            ×
          </button>

          {[7, 8, 9].map(num => (
            <button
              key={num}
              onClick={() => handleButtonClick(num.toString())}
              className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-lg transition-colors"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => handleButtonClick("-")}
            className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg transition-colors"
          >
            -
          </button>

          {[4, 5, 6].map(num => (
            <button
              key={num}
              onClick={() => handleButtonClick(num.toString())}
              className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-lg transition-colors"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => handleButtonClick("+")}
            className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg transition-colors"
          >
            +
          </button>

          {[1, 2, 3].map(num => (
            <button
              key={num}
              onClick={() => handleButtonClick(num.toString())}
              className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-lg transition-colors"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleCalculate}
            className="bg-primary hover:bg-primary/90 text-white p-2 rounded-lg transition-colors"
          >
            =
          </button>

          <button
            onClick={() => handleButtonClick("0")}
            className="col-span-2 bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-lg transition-colors"
          >
            0
          </button>
          <button
            onClick={() => handleButtonClick(".")}
            className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-lg transition-colors"
          >
            .
          </button>
        </div>
      </div>
    </motion.div>
  );
};