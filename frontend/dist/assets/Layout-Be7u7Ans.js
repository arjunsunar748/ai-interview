import{u as r,a as c,j as e,L as x,N as d}from"./index-BD66OloH.js";import{B as m}from"./brain-circuit-Bz7Soyb7.js";import{U as h}from"./user-CmqRPBSP.js";import{c as s}from"./createLucideIcon-BskhNwd6.js";import{M as y}from"./mic-CEXoX_k3.js";/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p=s("BarChart2",[["line",{x1:"18",x2:"18",y1:"20",y2:"10",key:"1xfpm4"}],["line",{x1:"12",x2:"12",y1:"20",y2:"4",key:"be30l9"}],["line",{x1:"6",x2:"6",y1:"20",y2:"14",key:"1r4le6"}]]);/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u=s("BookOpen",[["path",{d:"M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z",key:"vv98re"}],["path",{d:"M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z",key:"1cyq3y"}]]);/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b=s("FileText",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]]);/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f=s("LayoutDashboard",[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1",key:"10lvy0"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1",key:"16une8"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1",key:"1hutg5"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1",key:"ldoo1y"}]]);/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g=s("LogOut",[["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",key:"1uf3rs"}],["polyline",{points:"16 17 21 12 16 7",key:"1gabdz"}],["line",{x1:"21",x2:"9",y1:"12",y2:"12",key:"1uyos4"}]]);/**
 * @license lucide-react v0.383.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v=s("Shield",[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}]]);function N(){var i;const{user:a,logout:n,isAdmin:t}=r(),l=c(),o=()=>{n(),l("/login")};return e.jsx("nav",{className:"fixed top-0 left-0 right-0 z-50 h-16 glass border-b border-white/10",children:e.jsxs("div",{className:"max-w-7xl mx-auto px-4 h-full flex items-center justify-between",children:[e.jsxs(x,{to:t?"/admin":"/dashboard",className:"flex items-center gap-2",children:[e.jsx(m,{className:"w-7 h-7 text-sky-400"}),e.jsx("span",{className:"font-bold text-lg gradient-text",children:"AI Interview"})]}),e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsxs("div",{className:"flex items-center gap-2 glass px-3 py-1.5 rounded-xl",children:[e.jsx(h,{className:"w-4 h-4 text-slate-400"}),e.jsx("span",{className:"text-sm text-slate-300",children:(i=a==null?void 0:a.full_name)==null?void 0:i.split(" ")[0]})]}),e.jsx("button",{onClick:o,className:"p-2 rounded-xl hover:bg-white/10 transition-colors",title:"Logout",children:e.jsx(g,{className:"w-4 h-4 text-slate-400"})})]})]})})}const j=[{to:"/dashboard",icon:f,label:"Dashboard"},{to:"/interview",icon:y,label:"Interview"},{to:"/resume",icon:b,label:"Resume"},{to:"/analytics",icon:p,label:"Analytics"}],k=[{to:"/admin",icon:v,label:"Admin Panel"},{to:"/admin/questions",icon:u,label:"Questions"}];function w(){const{isAdmin:a}=r(),n=a?k:j;return e.jsxs("aside",{className:"fixed left-0 top-16 bottom-0 w-56 glass border-r border-white/10 flex flex-col p-4 z-40",children:[a&&e.jsx("p",{className:"text-xs text-violet-400 uppercase tracking-wide mb-3 px-4 font-semibold",children:"Administration"}),e.jsx("nav",{className:"flex flex-col gap-1 flex-1",children:n.map(({to:t,icon:l,label:o})=>e.jsxs(d,{to:t,className:({isActive:i})=>`sidebar-item ${i?"active":""}`,children:[e.jsx(l,{className:"w-5 h-5"}),e.jsx("span",{className:"text-sm font-medium",children:o})]},t))})]})}function I({children:a}){return e.jsxs("div",{className:"min-h-screen bg-slate-950",children:[e.jsx(N,{}),e.jsx(w,{}),e.jsx("main",{className:"ml-56 pt-16 min-h-screen",children:e.jsx("div",{className:"p-6 max-w-6xl mx-auto animate-fade-in",children:a})})]})}export{p as B,b as F,I as L,v as S,u as a};
