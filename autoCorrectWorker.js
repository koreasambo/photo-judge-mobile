import { autoCorrectImageData } from './autoCorrectEngine.js';
self.onmessage=e=>{
  const {id,imageData,options}=e.data||{};
  try{
    const result=autoCorrectImageData(imageData,options||{});
    self.postMessage({id,ok:true,result},[result.imageData.data.buffer]);
  }catch(err){
    self.postMessage({id,ok:false,error:String(err?.stack||err)});
  }
};