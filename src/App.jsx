import { useEffect, useState } from 'react'
import { ClerkProvider, SignIn, SignUp, useClerk, useUser } from '@clerk/react'
import { publishableKeyFromHost } from '@clerk/react/internal'
import { Route, Router as WouterRouter, Switch, Redirect, useLocation } from 'wouter'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useApi } from './api'
import { Header } from './components/Brand'
import Home from './pages/Home'
import Onboarding from './pages/Onboarding'
import OwnerPortal from './pages/OwnerPortal'
import LearnerPortal from './pages/LearnerPortal'

const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
function stripBase(path){return basePath&&path.startsWith(basePath)?path.slice(basePath.length)||'/':path}
const appearance={
  cssLayerName:'clerk',
  options:{logoPlacement:'inside',logoLinkUrl:basePath||'/',logoImageUrl:`${window.location.origin}${basePath}/logo.png`},
  variables:{colorPrimary:'#662d2b',colorPrimaryForeground:'#f7f2df',colorForeground:'#662d2b',colorMutedForeground:'#86574f',colorDanger:'#a03e31',colorBackground:'#fbf8ee',colorInput:'#fffdf6',colorInputForeground:'#662d2b',colorNeutral:'#662d2b',fontFamily:"'DM Sans', sans-serif",borderRadius:'2px'},
  elements:{rootBox:'w-full flex justify-center',cardBox:'bg-[#fbf8ee] w-[440px] max-w-full overflow-hidden border border-[#dcc4bb] shadow-[3px_5px_0_#662d2b14]',card:'!shadow-none !border-0 !bg-transparent !rounded-none',footer:'!shadow-none !border-0 !bg-transparent !rounded-none',headerTitle:"text-[#662d2b] !font-normal !text-[30px] font-['Instrument_Serif']",headerSubtitle:'text-[#86574f]',formFieldLabel:'text-[#662d2b] font-medium',footerActionLink:'text-[#a03e31] font-semibold underline underline-offset-4',footerActionText:'text-[#86574f]',formButtonPrimary:'bg-[#662d2b] text-[#f7f2df] font-semibold hover:bg-[#7a3835]',formFieldInput:'border border-[#dcc4bb] bg-[#fffdf6] text-[#662d2b]',socialButtonsBlockButton:'border border-[#dcc4bb] bg-[#fffdf6] hover:bg-[#f3ead2]',footerAction:'border-0',dividerLine:'bg-[#dcc4bb]',logoBox:'mb-2',logoImage:'max-h-9',formFieldRow:'mb-4',main:'gap-5'}
}

function AuthPages(){return <Switch><Route path="/sign-in/*?"><div className="flex min-h-[100dvh] items-center justify-center bg-[hsl(var(--canvas))] px-4 py-10"><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`}/></div></Route><Route path="/sign-up/*?"><div className="flex min-h-[100dvh] items-center justify-center bg-[hsl(var(--canvas))] px-4 py-10"><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`}/></div></Route></Switch>}
function HomeRoute(){const {isLoaded,user}=useUser();if(!isLoaded)return <Loading/>;return user?<Redirect to="/app"/>:<Home/>}
function ProtectedApp(){
  const {isLoaded,user}=useUser();const {signOut}=useClerk();const [,setLocation]=useLocation()
  const meResult=useApi(user?'/me':null);const me=meResult.data
  const approved=me?.workspaces?.filter(w=>w.status==='approved')||[]
  const [workspaceId,setWorkspaceId]=useState(()=>localStorage.getItem('link-workspace')||'')
  const [domain,setDomain]=useState(()=>localStorage.getItem('link-domain')||'culinary')
  const [role,setRoleState]=useState(()=>localStorage.getItem('link-role')||'owner')
  const [managing,setManaging]=useState(false)
  const workspace=approved.find(w=>String(w.id)===String(workspaceId))||approved[0]
  const roleCanOwn=workspace?.role==='owner'
  const effectiveId=workspace?.id
  const roleSet=next=>{const safe=next==='owner'&&!roleCanOwn?'learner':next;setRoleState(safe);localStorage.setItem('link-role',safe)}
  const bootstrapResult=useApi(effectiveId?`/w/${effectiveId}/bootstrap`:null)
  const bootstrap=bootstrapResult.data&&String(bootstrapResult.data.workspace?.id)===String(effectiveId)?bootstrapResult.data:null
  useEffect(()=>{localStorage.setItem('link-domain',domain)},[domain])
  useEffect(()=>{if(workspace){localStorage.setItem('link-workspace',workspace.id);if(workspaceId!==String(workspace.id))setWorkspaceId(String(workspace.id))}else localStorage.removeItem('link-workspace')},[workspaceId,workspace])
  useEffect(()=>{if(workspace&&!roleCanOwn&&role==='owner')roleSet('learner')},[workspace,roleCanOwn,role])
  useEffect(()=>{if(!isLoaded)return;if(!user){localStorage.removeItem('link-workspace');localStorage.removeItem('link-domain');localStorage.removeItem('link-role');setLocation('/')}},[isLoaded,user,setLocation])
  if(!isLoaded||user&&!me&&!meResult.error)return <Loading/>
  if(!user)return null
  if(meResult.error)return <main className="mx-auto max-w-xl px-5 py-24"><div className="surface rounded-2xl p-7"><AlertTriangle className="text-red-800"/><h1 className="serif mt-4 text-xl font-extrabold">Workspace account unavailable</h1><p className="mt-2 text-sm leading-6 muted">{meResult.error}</p><button onClick={meResult.reload} className="mt-5 flex items-center gap-2 text-xs font-bold owner-color"><RefreshCw size={14}/>Retry</button></div></main>
  if(!workspace)return <Onboarding me={me} reloadMe={meResult.reload}/>
  if(managing)return <Onboarding me={me} reloadMe={async()=>{await meResult.reload();setManaging(false)}} onBack={()=>setManaging(false)}/>
  if(bootstrapResult.loading&&!bootstrap)return <Loading/>
  if(bootstrapResult.error&&!bootstrap)return <main className="mx-auto max-w-xl px-5 py-24"><div className="surface rounded-2xl p-7"><AlertTriangle className="text-red-800"/><h1 className="serif mt-4 text-xl font-extrabold">Could not open workspace</h1><p className="mt-2 text-sm leading-6 muted">{bootstrapResult.error}</p><button onClick={bootstrapResult.reload} className="mt-5 flex items-center gap-2 text-xs font-bold owner-color"><RefreshCw size={14}/>Retry</button></div></main>
  const userInfo={name:me?.user?.name||user.fullName,email:me?.user?.email||user.primaryEmailAddress?.emailAddress}
  return <div className="min-h-[100dvh]"><Header user={userInfo} workspace={workspace} workspaces={approved} selectWorkspace={id=>setWorkspaceId(id)} role={roleCanOwn?role:'learner'} setRole={roleSet} roleCanOwn={roleCanOwn} domain={domain} setDomain={setDomain} manageWorkspaces={()=>setManaging(true)} signOut={()=>signOut({redirectUrl:basePath||'/'})}/>{roleCanOwn&&role==='owner'?<OwnerPortal key={`${effectiveId}-${domain}`} workspaceId={effectiveId} bootstrap={bootstrap} reloadBootstrap={bootstrapResult.reload} domain={domain}/>:<LearnerPortal key={`${effectiveId}-${domain}`} workspaceId={effectiveId} domain={domain} user={userInfo}/>}</div>
}
function AppRoute(){const {isLoaded,user}=useUser();if(!isLoaded)return <Loading/>;return user?<ProtectedApp key={user.id}/>:<Redirect to="/"/>}
function Loading(){return <div className="min-h-[100dvh] px-4 py-8"><div className="mx-auto max-w-7xl"><div className="surface h-[68px] animate-pulse rounded-xl"/><div className="mt-8 grid gap-4 md:grid-cols-3">{[1,2,3].map(x=><div key={x} className="surface h-40 animate-pulse rounded-2xl"/>)}</div></div></div>}
function ClerkCacheInvalidator(){const {addListener}=useClerk();useEffect(()=>{let previous;const unsubscribe=addListener(({user})=>{const id=user?.id??null;if(previous!==undefined&&previous!==id){localStorage.removeItem('link-workspace');localStorage.removeItem('link-domain');localStorage.removeItem('link-role')}previous=id});return unsubscribe},[addListener]);return null}
function RoutedApp(){return <><ClerkCacheInvalidator/><Switch><Route path="/sign-in/*?"/><Route path="/sign-up/*?"/><Route path="/" component={HomeRoute}/><Route path="/app" component={AppRoute}/><Route><Redirect to="/"/></Route></Switch></>}
function ClerkProviderWithRoutes(){
  const [,setLocation]=useLocation()
  return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={appearance} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} localization={{signIn:{start:{title:'Welcome back',subtitle:'Sign in to your Link workspace'}},signUp:{start:{title:'Create your Link account',subtitle:'Build a trusted learning space for your team'}}}} routerPush={to=>setLocation(stripBase(to))} routerReplace={to=>setLocation(stripBase(to),{replace:true})}><AuthPages/><RoutedApp/></ClerkProvider>
}
function App(){return <WouterRouter base={basePath}><ClerkProviderWithRoutes/></WouterRouter>}
export default App
