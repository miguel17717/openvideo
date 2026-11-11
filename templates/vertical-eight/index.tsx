import React from 'react';
import {AbsoluteFill,Composition,Img,OffthreadVideo,Sequence,interpolate,spring,staticFile,useCurrentFrame,registerRoot} from 'remotion';
import {loadFont} from '@remotion/google-fonts/BeVietnamPro';
const {fontFamily}=loadFont('normal',{weights:['500','600','700','800'],subsets:['latin','vietnamese']});
type Scene={type:'card'|'image'|'video'|'end';duration:number;title:string;body?:string;src?:string};
type Props={brand:string;scenes:Scene[]};
const fallback:Props={brand:'OpenVideo',scenes:[{type:'card',duration:3,title:'OpenVideo',body:'Thêm nội dung trong artifacts/scenes.json'}]};
const Shot:React.FC<{scene:Scene;brand:string}>=({scene,brand})=>{
 const frame=useCurrentFrame();const a=spring({frame:frame-5,fps:30,config:{damping:20,stiffness:100}});const duration=Math.round(scene.duration*30);
 return <AbsoluteFill style={{fontFamily,background:'#052751',color:'white',overflow:'hidden'}}>
 {scene.type==='image'&&scene.src?<Img src={staticFile(scene.src)} style={{width:'100%',height:'100%',objectFit:'cover',transform:`scale(${interpolate(frame,[0,duration],[1,1.035])})`}}/>:null}
 {scene.type==='video'&&scene.src?<OffthreadVideo src={staticFile(scene.src)} muted style={{width:'100%',height:'100%',objectFit:'cover'}}/>:null}
 {scene.src?<AbsoluteFill style={{background:'linear-gradient(180deg,rgba(0,20,45,.05),rgba(0,20,45,.2) 35%,rgba(0,20,45,.95) 75%)'}}/>:null}
 <div style={{position:'absolute',top:65,right:70,fontSize:42,fontWeight:800,background:'#052751',padding:'10px 20px',borderRadius:12}}>{brand}</div>
 <div style={{position:'absolute',left:80,right:80,top:scene.src?1040:600,opacity:a,transform:`translateY(${(1-a)*40}px)`}}>
 <div style={{fontSize:84,fontWeight:800,lineHeight:1.2,whiteSpace:'pre-line'}}>{scene.title}</div>
 <div style={{height:8,width:170,background:'#39A4FF',margin:'35px 0'}}/>
 <div style={{fontSize:36,fontWeight:500,lineHeight:1.5,whiteSpace:'pre-line',color:'#D2E5F7'}}>{scene.body}</div>
 </div>
 <div style={{position:'absolute',bottom:0,left:0,height:6,width:`${Math.min(100,100*frame/duration)}%`,background:'#39A4FF'}}/>
 </AbsoluteFill>
};
const Film:React.FC<Props>=({brand,scenes})=>{let cursor=0;return <AbsoluteFill>{scenes.map((scene,i)=>{const from=cursor;const length=Math.round(scene.duration*30);cursor+=length;return <Sequence key={i} from={from} durationInFrames={length}><Shot scene={scene} brand={brand}/></Sequence>})}</AbsoluteFill>};
registerRoot(()=> <Composition id="OpenVideo" component={Film} width={1080} height={1920} fps={30} durationInFrames={90} defaultProps={fallback} calculateMetadata={({props})=>({durationInFrames:props.scenes.reduce((sum,s)=>sum+Math.round(s.duration*30),0)})}/>);
