(function(){var e=globalThis,t=e.ShadowRoot&&(e.ShadyCSS===void 0||e.ShadyCSS.nativeShadow)&&`adoptedStyleSheets`in Document.prototype&&`replace`in CSSStyleSheet.prototype,n=Symbol(),r=new WeakMap,i=class{constructor(e,t,r){if(this._$cssResult$=!0,r!==n)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o,n=this.t;if(t&&e===void 0){let t=n!==void 0&&n.length===1;t&&(e=r.get(n)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),t&&r.set(n,e))}return e}toString(){return this.cssText}},a=e=>new i(typeof e==`string`?e:e+``,void 0,n),o=(e,...t)=>new i(e.length===1?e[0]:t.reduce((t,n,r)=>t+(e=>{if(!0===e._$cssResult$)return e.cssText;if(typeof e==`number`)return e;throw Error(`Value passed to 'css' function must be a 'css' function result: `+e+`. Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.`)})(n)+e[r+1],e[0]),e,n),s=(n,r)=>{if(t)n.adoptedStyleSheets=r.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(let t of r){let r=document.createElement(`style`),i=e.litNonce;i!==void 0&&r.setAttribute(`nonce`,i),r.textContent=t.cssText,n.appendChild(r)}},c=t?e=>e:e=>e instanceof CSSStyleSheet?(e=>{let t=``;for(let n of e.cssRules)t+=n.cssText;return a(t)})(e):e,{is:l,defineProperty:u,getOwnPropertyDescriptor:d,getOwnPropertyNames:ee,getOwnPropertySymbols:te,getPrototypeOf:ne}=Object,f=globalThis,p=f.trustedTypes,re=p?p.emptyScript:``,ie=f.reactiveElementPolyfillSupport,m=(e,t)=>e,h={toAttribute(e,t){switch(t){case Boolean:e=e?re:null;break;case Object:case Array:e=e==null?e:JSON.stringify(e)}return e},fromAttribute(e,t){let n=e;switch(t){case Boolean:n=e!==null;break;case Number:n=e===null?null:Number(e);break;case Object:case Array:try{n=JSON.parse(e)}catch{n=null}}return n}},g=(e,t)=>!l(e,t),_={attribute:!0,type:String,converter:h,reflect:!1,useDefault:!1,hasChanged:g};Symbol.metadata??=Symbol(`metadata`),f.litPropertyMetadata??=new WeakMap;var v=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=_){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){let n=Symbol(),r=this.getPropertyDescriptor(e,n,t);r!==void 0&&u(this.prototype,e,r)}}static getPropertyDescriptor(e,t,n){let{get:r,set:i}=d(this.prototype,e)??{get(){return this[t]},set(e){this[t]=e}};return{get:r,set(t){let a=r?.call(this);i?.call(this,t),this.requestUpdate(e,a,n)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??_}static _$Ei(){if(this.hasOwnProperty(m(`elementProperties`)))return;let e=ne(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(m(`finalized`)))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(m(`properties`))){let e=this.properties,t=[...ee(e),...te(e)];for(let n of t)this.createProperty(n,e[n])}let e=this[Symbol.metadata];if(e!==null){let t=litPropertyMetadata.get(e);if(t!==void 0)for(let[e,n]of t)this.elementProperties.set(e,n)}this._$Eh=new Map;for(let[e,t]of this.elementProperties){let n=this._$Eu(e,t);n!==void 0&&this._$Eh.set(n,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){let t=[];if(Array.isArray(e)){let n=new Set(e.flat(1/0).reverse());for(let e of n)t.unshift(c(e))}else e!==void 0&&t.push(c(e));return t}static _$Eu(e,t){let n=t.attribute;return!1===n?void 0:typeof n==`string`?n:typeof e==`string`?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),this.renderRoot!==void 0&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){let e=new Map,t=this.constructor.elementProperties;for(let n of t.keys())this.hasOwnProperty(n)&&(e.set(n,this[n]),delete this[n]);e.size>0&&(this._$Ep=e)}createRenderRoot(){let e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return s(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,n){this._$AK(e,n)}_$ET(e,t){let n=this.constructor.elementProperties.get(e),r=this.constructor._$Eu(e,n);if(r!==void 0&&!0===n.reflect){let i=(n.converter?.toAttribute===void 0?h:n.converter).toAttribute(t,n.type);this._$Em=e,i==null?this.removeAttribute(r):this.setAttribute(r,i),this._$Em=null}}_$AK(e,t){let n=this.constructor,r=n._$Eh.get(e);if(r!==void 0&&this._$Em!==r){let e=n.getPropertyOptions(r),i=typeof e.converter==`function`?{fromAttribute:e.converter}:e.converter?.fromAttribute===void 0?h:e.converter;this._$Em=r;let a=i.fromAttribute(t,e.type);this[r]=a??this._$Ej?.get(r)??a,this._$Em=null}}requestUpdate(e,t,n,r=!1,i){if(e!==void 0){let a=this.constructor;if(!1===r&&(i=this[e]),n??=a.getPropertyOptions(e),!((n.hasChanged??g)(i,t)||n.useDefault&&n.reflect&&i===this._$Ej?.get(e)&&!this.hasAttribute(a._$Eu(e,n))))return;this.C(e,t,n)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(e,t,{useDefault:n,reflect:r,wrapped:i},a){n&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,a??t??this[e]),!0!==i||a!==void 0)||(this._$AL.has(e)||(this.hasUpdated||n||(t=void 0),this._$AL.set(e,t)),!0===r&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}let e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[e,t]of this._$Ep)this[e]=t;this._$Ep=void 0}let e=this.constructor.elementProperties;if(e.size>0)for(let[t,n]of e){let{wrapped:e}=n,r=this[t];!0!==e||this._$AL.has(t)||r===void 0||this.C(t,void 0,n,r)}}let e=!1,t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(t)):this._$EM()}catch(t){throw e=!1,this._$EM(),t}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(e){}firstUpdated(e){}};v.elementStyles=[],v.shadowRootOptions={mode:`open`},v[m(`elementProperties`)]=new Map,v[m(`finalized`)]=new Map,ie?.({ReactiveElement:v}),(f.reactiveElementVersions??=[]).push(`2.1.2`);var y=globalThis,ae=e=>e,b=y.trustedTypes,x=b?b.createPolicy(`lit-html`,{createHTML:e=>e}):void 0,S=`$lit$`,C=`lit$${Math.random().toFixed(9).slice(2)}$`,w=`?`+C,oe=`<${w}>`,T=document,E=()=>T.createComment(``),D=e=>e===null||typeof e!=`object`&&typeof e!=`function`,O=Array.isArray,se=e=>O(e)||typeof e?.[Symbol.iterator]==`function`,k=`[ 	
\f\r]`,A=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,j=/-->/g,M=/>/g,N=RegExp(`>|${k}(?:([^\\s"'>=/]+)(${k}*=${k}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,`g`),P=/'/g,F=/"/g,I=/^(?:script|style|textarea|title)$/i,L=(e=>(t,...n)=>({_$litType$:e,strings:t,values:n}))(1),R=Symbol.for(`lit-noChange`),z=Symbol.for(`lit-nothing`),B=new WeakMap,V=T.createTreeWalker(T,129);function H(e,t){if(!O(e)||!e.hasOwnProperty(`raw`))throw Error(`invalid template strings array`);return x===void 0?t:x.createHTML(t)}var ce=(e,t)=>{let n=e.length-1,r=[],i,a=t===2?`<svg>`:t===3?`<math>`:``,o=A;for(let t=0;t<n;t++){let n=e[t],s,c,l=-1,u=0;for(;u<n.length&&(o.lastIndex=u,c=o.exec(n),c!==null);)u=o.lastIndex,o===A?c[1]===`!--`?o=j:c[1]===void 0?c[2]===void 0?c[3]!==void 0&&(o=N):(I.test(c[2])&&(i=RegExp(`</`+c[2],`g`)),o=N):o=M:o===N?c[0]===`>`?(o=i??A,l=-1):c[1]===void 0?l=-2:(l=o.lastIndex-c[2].length,s=c[1],o=c[3]===void 0?N:c[3]===`"`?F:P):o===F||o===P?o=N:o===j||o===M?o=A:(o=N,i=void 0);let d=o===N&&e[t+1].startsWith(`/>`)?` `:``;a+=o===A?n+oe:l>=0?(r.push(s),n.slice(0,l)+S+n.slice(l)+C+d):n+C+(l===-2?t:d)}return[H(e,a+(e[n]||`<?>`)+(t===2?`</svg>`:t===3?`</math>`:``)),r]},U=class e{constructor({strings:t,_$litType$:n},r){let i;this.parts=[];let a=0,o=0,s=t.length-1,c=this.parts,[l,u]=ce(t,n);if(this.el=e.createElement(l,r),V.currentNode=this.el.content,n===2||n===3){let e=this.el.content.firstChild;e.replaceWith(...e.childNodes)}for(;(i=V.nextNode())!==null&&c.length<s;){if(i.nodeType===1){if(i.hasAttributes())for(let e of i.getAttributeNames())if(e.endsWith(S)){let t=u[o++],n=i.getAttribute(e).split(C),r=/([.?@])?(.*)/.exec(t);c.push({type:1,index:a,name:r[2],strings:n,ctor:r[1]===`.`?ue:r[1]===`?`?de:r[1]===`@`?fe:K}),i.removeAttribute(e)}else e.startsWith(C)&&(c.push({type:6,index:a}),i.removeAttribute(e));if(I.test(i.tagName)){let e=i.textContent.split(C),t=e.length-1;if(t>0){i.textContent=b?b.emptyScript:``;for(let n=0;n<t;n++)i.append(e[n],E()),V.nextNode(),c.push({type:2,index:++a});i.append(e[t],E())}}}else if(i.nodeType===8)if(i.data===w)c.push({type:2,index:a});else{let e=-1;for(;(e=i.data.indexOf(C,e+1))!==-1;)c.push({type:7,index:a}),e+=C.length-1}a++}}static createElement(e,t){let n=T.createElement(`template`);return n.innerHTML=e,n}};function W(e,t,n=e,r){if(t===R)return t;let i=r===void 0?n._$Cl:n._$Co?.[r],a=D(t)?void 0:t._$litDirective$;return i?.constructor!==a&&(i?._$AO?.(!1),a===void 0?i=void 0:(i=new a(e),i._$AT(e,n,r)),r===void 0?n._$Cl=i:(n._$Co??=[])[r]=i),i!==void 0&&(t=W(e,i._$AS(e,t.values),i,r)),t}var le=class{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){let{el:{content:t},parts:n}=this._$AD,r=(e?.creationScope??T).importNode(t,!0);V.currentNode=r;let i=V.nextNode(),a=0,o=0,s=n[0];for(;s!==void 0;){if(a===s.index){let t;s.type===2?t=new G(i,i.nextSibling,this,e):s.type===1?t=new s.ctor(i,s.name,s.strings,this,e):s.type===6&&(t=new pe(i,this,e)),this._$AV.push(t),s=n[++o]}a!==s?.index&&(i=V.nextNode(),a++)}return V.currentNode=T,r}p(e){let t=0;for(let n of this._$AV)n!==void 0&&(n.strings===void 0?n._$AI(e[t]):(n._$AI(e,n,t),t+=n.strings.length-2)),t++}},G=class e{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,n,r){this.type=2,this._$AH=z,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=n,this.options=r,this._$Cv=r?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode,t=this._$AM;return t!==void 0&&e?.nodeType===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=W(this,e,t),D(e)?e===z||e==null||e===``?(this._$AH!==z&&this._$AR(),this._$AH=z):e!==this._$AH&&e!==R&&this._(e):e._$litType$===void 0?e.nodeType===void 0?se(e)?this.k(e):this._(e):this.T(e):this.$(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==z&&D(this._$AH)?this._$AA.nextSibling.data=e:this.T(T.createTextNode(e)),this._$AH=e}$(e){let{values:t,_$litType$:n}=e,r=typeof n==`number`?this._$AC(e):(n.el===void 0&&(n.el=U.createElement(H(n.h,n.h[0]),this.options)),n);if(this._$AH?._$AD===r)this._$AH.p(t);else{let e=new le(r,this),n=e.u(this.options);e.p(t),this.T(n),this._$AH=e}}_$AC(e){let t=B.get(e.strings);return t===void 0&&B.set(e.strings,t=new U(e)),t}k(t){O(this._$AH)||(this._$AH=[],this._$AR());let n=this._$AH,r,i=0;for(let a of t)i===n.length?n.push(r=new e(this.O(E()),this.O(E()),this,this.options)):r=n[i],r._$AI(a),i++;i<n.length&&(this._$AR(r&&r._$AB.nextSibling,i),n.length=i)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){let t=ae(e).nextSibling;ae(e).remove(),e=t}}setConnected(e){this._$AM===void 0&&(this._$Cv=e,this._$AP?.(e))}},K=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,n,r,i){this.type=1,this._$AH=z,this._$AN=void 0,this.element=e,this.name=t,this._$AM=r,this.options=i,n.length>2||n[0]!==``||n[1]!==``?(this._$AH=Array(n.length-1).fill(new String),this.strings=n):this._$AH=z}_$AI(e,t=this,n,r){let i=this.strings,a=!1;if(i===void 0)e=W(this,e,t,0),a=!D(e)||e!==this._$AH&&e!==R,a&&(this._$AH=e);else{let r=e,o,s;for(e=i[0],o=0;o<i.length-1;o++)s=W(this,r[n+o],t,o),s===R&&(s=this._$AH[o]),a||=!D(s)||s!==this._$AH[o],s===z?e=z:e!==z&&(e+=(s??``)+i[o+1]),this._$AH[o]=s}a&&!r&&this.j(e)}j(e){e===z?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??``)}},ue=class extends K{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===z?void 0:e}},de=class extends K{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==z)}},fe=class extends K{constructor(e,t,n,r,i){super(e,t,n,r,i),this.type=5}_$AI(e,t=this){if((e=W(this,e,t,0)??z)===R)return;let n=this._$AH,r=e===z&&n!==z||e.capture!==n.capture||e.once!==n.once||e.passive!==n.passive,i=e!==z&&(n===z||r);r&&this.element.removeEventListener(this.name,this,n),i&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){typeof this._$AH==`function`?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}},pe=class{constructor(e,t,n){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=n}get _$AU(){return this._$AM._$AU}_$AI(e){W(this,e)}},me=y.litHtmlPolyfillSupport;me?.(U,G),(y.litHtmlVersions??=[]).push(`3.3.2`);var he=(e,t,n)=>{let r=n?.renderBefore??t,i=r._$litPart$;if(i===void 0){let e=n?.renderBefore??null;r._$litPart$=i=new G(t.insertBefore(E(),e),e,void 0,n??{})}return i._$AI(e),i},q=globalThis,J=class extends v{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){let t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=he(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return R}};J._$litElement$=!0,J.finalized=!0,q.litElementHydrateSupport?.({LitElement:J});var ge=q.litElementPolyfillSupport;ge?.({LitElement:J}),(q.litElementVersions??=[]).push(`4.2.2`);var _e=class extends J{static properties={question:{},options:{type:Array},selected:{}};static styles=o`
    :host { display: block; margin: 0 12px; padding: 14px 16px; border: 1px solid #ece8e0; border-radius: var(--a2ui-radius-md); background: #fff; font-family: var(--a2ui-font-sans); box-shadow: 0 1px 2px rgba(20, 18, 14, 0.04), 0 6px 16px -10px rgba(20, 18, 14, 0.08); }
    .q { font-weight: 600; margin-bottom: 10px; font-size: 14px; color: #1B1B1F; }
    button { font: inherit; font-size: 13px; padding: 7px 14px; margin: 3px 6px 3px 0; border-radius: 999px; border: 1px solid #e5e1d8; background: #faf7f1; color: #2a2a30; cursor: pointer; transition: background .15s, border-color .15s, transform .08s; }
    button:active { transform: scale(0.97); }
    button[aria-pressed="true"] { background: var(--a2ui-color-accent); color: #fff; border-color: var(--a2ui-color-accent); }
  `;constructor(){super(),this.options=[],this.selected=null}render(){return L`
      <div class="q">${this.question}</div>
      ${this.options.map(e=>L`
        <button aria-pressed=${this.selected===e.value} @click=${()=>this._pick(e.value)}>${e.label}</button>
      `)}
    `}_pick(e){this.selected=e,window.AndroidBridge?.onAction(JSON.stringify({component:`chip-group`,value:e}))}};customElements.define(`a2ui-chip-group`,_e);var ve=class extends J{static properties={section:{},reasoning:{},items:{type:Array}};static styles=o`
    :host { display: block; font-family: var(--a2ui-font-sans); }
    .section {
      font-family: var(--a2ui-font-serif);
      font-weight: 600;
      font-size: 19px;
      color: #1B1B1F;
      padding: 0 12px 6px;
      letter-spacing: -0.01em;
    }
    .reason { padding: 0 12px 10px; color: #44424a; font-size: 13px; line-height: 1.4; }
    .rail {
      display: flex; gap: 10px;
      overflow-x: auto; overflow-y: hidden;
      -webkit-overflow-scrolling: touch;
      /* proximity (not mandatory) — a half-flick lands on the nearest snap
         instead of rubber-banding hard back; preserves momentum. */
      scroll-snap-type: x proximity;
      scroll-snap-stop: always;
      scroll-padding-inline: 12px;
      padding: 4px 12px 8px;
      margin: 0;
      scrollbar-width: none;
      /* Tell the browser this region is for horizontal panning so the parent
         LazyColumn's vertical-scroll handler doesn't fight the carousel
         swipes (and vertical drags still bubble up to it). */
      touch-action: pan-x;
      /* Don't let overscroll bubble to the parent and yank the whole list. */
      overscroll-behavior-x: contain;
    }
    .rail::-webkit-scrollbar { display: none; }
    .card {
      flex: 0 0 132px; scroll-snap-align: start;
      background: #fff; border: 1px solid #ece8e0; border-radius: var(--a2ui-radius-md);
      overflow: hidden; cursor: pointer;
      transition: transform .12s, box-shadow .15s;
      box-shadow: 0 1px 2px rgba(20, 18, 14, 0.04), 0 6px 16px -10px rgba(20, 18, 14, 0.08);
    }
    .card:active { transform: scale(0.985); }
    .card img {
      width: 100%; height: 132px; object-fit: cover; display: block;
      background: #f4efe6;
      /* Stop image drag-and-drop from cancelling the pan gesture mid-flick. */
      pointer-events: none;
      user-select: none;
      -webkit-user-drag: none;
    }
    .body { padding: 10px; }
    .name {
      font-family: var(--a2ui-font-serif);
      font-weight: 600;
      font-size: 14px;
      line-height: 1.25;
      color: #1B1B1F;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .price-row {
      display: flex; align-items: baseline; gap: 6px;
      margin-top: 4px;
      font-family: var(--a2ui-font-serif);
    }
    .price { font-weight: 600; color: #1B1B1F; font-size: 13px; }
    .price.sale { color: #b6473a; }
    .price-orig { color: #9a9099; font-size: 11px; text-decoration: line-through; font-weight: 500; }
    .vendor {
      color: #6b6973;
      font-size: 11px;
      margin-top: 3px;
      letter-spacing: 0.01em;
    }
    .why { color: #6b6973; font-size: 12px; margin-top: 6px; line-height: 1.3; }
  `;render(){return L`
      ${this.section?L`<div class="section">${this.section}</div>`:null}
      ${this.reasoning?L`<div class="reason">${this.reasoning}</div>`:null}
      <div class="rail">
        ${this.items.map(e=>{let t=e.sale_price!=null&&e.sale_price<e.price;return L`
            <div class="card" @click=${()=>this._tap(e)}>
              <img src=${e.image_url} alt=${e.name}>
              <div class="body">
                <div class="name">${e.name}</div>
                <div class="price-row">
                  <span class="price ${t?`sale`:``}">$${t?e.sale_price:e.price}</span>
                  ${t?L`<span class="price-orig">$${e.price}</span>`:null}
                </div>
                ${e.vendor?L`<div class="vendor">${e.vendor}</div>`:null}
                ${e.why?L`<div class="why">${e.why}</div>`:null}
              </div>
            </div>
          `})}
      </div>
    `}_tap(e){window.AndroidBridge?.onAction(JSON.stringify({component:`card-grid`,product_id:e.id,name:e.name}))}};customElements.define(`a2ui-card-grid`,ve);var ye=class extends J{static properties={product:{},variant_groups:{type:Array},selection:{state:!0},activeImage:{state:!0}};static styles=o`
    :host {
      display: block;
      font-family: var(--a2ui-font-sans);
      background: #fff;
      border-radius: var(--a2ui-radius-md);
      overflow: hidden;
      padding: 0 0 76px;
      position: relative;
    }
    .gallery {
      position: relative;
      background: #f4efe6;
      /* Hint to the browser that this region is for horizontal panning so
         vertical-scroll containers don't fight the carousel swipes. */
      touch-action: pan-x;
    }
    .close {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 36px; height: 36px;
      border-radius: 999px;
      border: 0;
      background: rgba(20,18,14,0.55);
      color: #fff;
      font: inherit;
      font-size: 18px;
      line-height: 1;
      display: grid;
      place-items: center;
      cursor: pointer;
      z-index: 2;
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      box-shadow: 0 4px 12px -4px rgba(20,18,14,0.5);
      transition: transform .08s, background .15s;
    }
    .close:active { transform: scale(0.94); background: rgba(20,18,14,0.75); }
    .gallery-track {
      display: flex;
      overflow-x: auto;
      overflow-y: hidden;
      /* proximity snap is more forgiving than mandatory on small devices —
         a half-flick lands on the nearest snap rather than rubber-banding. */
      scroll-snap-type: x proximity;
      scroll-snap-stop: always;
      scrollbar-width: none;
      overscroll-behavior-x: contain;
      touch-action: pan-x;
    }
    .gallery-track::-webkit-scrollbar { display: none; }
    .slide {
      flex: 0 0 100%;
      scroll-snap-align: center;
      width: 100%;
      pointer-events: auto;
    }
    .slide img {
      width: 100%;
      height: 240px;
      object-fit: cover;
      display: block;
      background: #f4efe6;
      /* Stop image drag-and-drop from cancelling the pan gesture. */
      pointer-events: none;
      user-select: none;
      -webkit-user-drag: none;
    }
    .dots {
      position: absolute;
      bottom: 10px;
      left: 0; right: 0;
      display: flex;
      justify-content: center;
      gap: 6px;
      pointer-events: none;
    }
    .dot {
      width: 6px; height: 6px;
      border-radius: 999px;
      background: rgba(255,255,255,0.55);
      box-shadow: 0 0 0 1px rgba(20,18,14,0.12);
    }
    .dot.active { background: #fff; box-shadow: 0 0 0 1px rgba(20,18,14,0.2); }
    .body { padding: 16px 16px 0; }
    .name {
      font-family: var(--a2ui-font-serif);
      font-weight: 600;
      font-size: 22px;
      line-height: 1.18;
      letter-spacing: -0.01em;
      color: #1B1B1F;
    }
    .vendor-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 14px;
      padding: 12px 12px;
      background: #faf7f1;
      border-radius: 12px;
    }
    .vendor {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }
    .vendor-mark {
      width: 24px; height: 24px;
      border-radius: 999px;
      background: var(--a2ui-color-accent);
      color: #fff;
      display: grid; place-items: center;
      font-family: var(--a2ui-font-serif);
      font-weight: 700;
      font-size: 13px;
      flex: 0 0 auto;
    }
    .vendor-text { display: flex; flex-direction: column; min-width: 0; }
    .vendor-name {
      font-size: 13px; font-weight: 600; color: #1B1B1F;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .vendor-sub { font-size: 11px; color: #6b6973; }
    .price-block {
      display: flex; flex-direction: column; align-items: flex-end; flex: 0 0 auto;
      font-family: var(--a2ui-font-serif);
    }
    .price { font-weight: 600; font-size: 18px; color: #1B1B1F; }
    .price.sale { color: #b6473a; }
    .price-orig { font-size: 12px; color: #9a9099; text-decoration: line-through; font-weight: 500; }
    .description {
      margin: 14px 16px 0;
      color: #44424a;
      font-size: 13px;
      line-height: 1.5;
    }
    .group { margin: 14px 16px 0; }
    .label {
      font-size: 11px; color: #8a8790; text-transform: uppercase;
      letter-spacing: .8px; margin-bottom: 8px; font-weight: 600;
    }
    button.opt {
      font: inherit; font-size: 13px;
      padding: 6px 13px; margin: 3px 6px 3px 0;
      border-radius: 999px; border: 1px solid #e5e1d8;
      background: #faf7f1; color: #2a2a30;
      cursor: pointer;
      transition: background .15s, border-color .15s, transform .08s;
    }
    button.opt:active { transform: scale(0.97); }
    button.opt[aria-pressed="true"] {
      background: var(--a2ui-color-accent);
      color: #fff;
      border-color: var(--a2ui-color-accent);
    }
    .actions {
      display: flex; gap: 10px;
      margin: 18px 16px 0;
    }
    .visit {
      flex: 1;
      padding: 12px 16px;
      border-radius: 999px;
      background: #fff;
      border: 1px solid #d8d2c5;
      color: #1B1B1F;
      font: inherit;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: transform .08s, background .15s;
    }
    .visit:active { transform: scale(0.98); }
    .cta {
      flex: 1.3;
      padding: 12px 18px;
      border-radius: 999px;
      border: 0;
      background: var(--a2ui-color-accent);
      color: #fff;
      font: inherit;
      font-weight: 600;
      font-size: 14px;
      letter-spacing: .2px;
      cursor: pointer;
      box-shadow: 0 4px 12px -4px rgba(91, 108, 255, 0.5);
      transition: transform .08s;
    }
    .cta:active { transform: scale(0.98); }
    .followup {
      position: absolute;
      bottom: 14px;
      right: 14px;
      padding: 9px 16px;
      border-radius: 999px;
      background: #1B1B1F;
      color: #fff;
      border: 0;
      font: inherit;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 6px 18px -6px rgba(20,18,14,0.45);
      transition: transform .08s;
    }
    .followup:active { transform: scale(0.97); }
  `;constructor(){super(),this.selection={},this.activeImage=0}firstUpdated(){let e=this.renderRoot.querySelector(`.gallery-track`);e&&e.addEventListener(`scroll`,()=>{let t=e.clientWidth||1,n=Math.round(e.scrollLeft/t);n!==this.activeImage&&(this.activeImage=n)},{passive:!0})}render(){let e=this.product||{},t=e.images&&e.images.length?e.images:[e.image_url].filter(Boolean),n=e.vendor||`Lumen Goods`,r=(n[0]||`L`).toUpperCase(),i=e.sale_price!=null&&e.sale_price<e.price;return L`
      <div class="gallery">
        <button class="close" aria-label="Close" @click=${this._close}>✕</button>
        <div class="gallery-track">
          ${t.map(t=>L`
            <div class="slide"><img src=${t} alt=${e.name||``}></div>
          `)}
        </div>
        ${t.length>1?L`
          <div class="dots">
            ${t.map((e,t)=>L`
              <div class="dot ${t===this.activeImage?`active`:``}"></div>
            `)}
          </div>
        `:null}
      </div>

      <div class="body">
        <div class="name">${e.name}</div>
      </div>

      <div class="vendor-row">
        <div class="vendor">
          <div class="vendor-mark">${r}</div>
          <div class="vendor-text">
            <div class="vendor-name">${n}</div>
            <div class="vendor-sub">${e.in_stock===!1?`Out of stock`:`In stock`}</div>
          </div>
        </div>
        <div class="price-block">
          <span class="price ${i?`sale`:``}">$${i?e.sale_price:e.price}</span>
          ${i?L`<span class="price-orig">$${e.price}</span>`:null}
        </div>
      </div>

      ${e.description?L`<div class="description">${e.description}</div>`:null}

      ${(this.variant_groups||[]).map(e=>L`
        <div class="group">
          <div class="label">${e.name}</div>
          ${e.options.map(t=>L`
            <button class="opt"
              aria-pressed=${this.selection[e.name]===t}
              @click=${()=>this._pick(e.name,t)}>${t}</button>
          `)}
        </div>
      `)}

      <div class="actions">
        <button class="visit" @click=${this._visit}>Visit ${n}</button>
        <button class="cta" @click=${this._confirm}>Add to Order</button>
      </div>

      <button class="followup" @click=${this._followup}>Follow up</button>
    `}_pick(e,t){this.selection={...this.selection,[e]:t}}_confirm(){window.AndroidBridge?.onAction(JSON.stringify({component:`product-detail`,product_id:this.product.id,name:this.product.name,variants:this.selection}))}_visit(){window.AndroidBridge?.onAction(JSON.stringify({component:`product-detail-visit`,product_id:this.product.id,name:this.product.name,vendor:this.product.vendor}))}_followup(){window.AndroidBridge?.onAction(JSON.stringify({component:`product-detail-followup`,product_id:this.product.id,name:this.product.name}))}_close(){window.AndroidBridge?.onAction(JSON.stringify({component:`product-detail-close`}))}};customElements.define(`a2ui-product-detail`,ye);var be=class extends J{static properties={fields:{type:Array},values:{state:!0}};static styles=o`
    :host { display: block; margin: 0 12px; font-family: var(--a2ui-font-sans); background: #fff; border: 1px solid #ece8e0; border-radius: var(--a2ui-radius-md); padding: 14px; box-shadow: 0 1px 2px rgba(20, 18, 14, 0.04), 0 6px 16px -10px rgba(20, 18, 14, 0.08); }
    .row { margin-bottom: 12px; }
    .label { font-size: 11px; color: #8a8790; text-transform: uppercase; letter-spacing: .8px; margin-bottom: 6px; font-weight: 600; }
    input, textarea { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #e5e1d8; border-radius: 10px; font: inherit; font-size: 14px; color: #1B1B1F; background: #faf7f1; transition: border-color .15s, background .15s; }
    input:focus, textarea:focus { outline: none; border-color: var(--a2ui-color-accent); background: #fff; }
    .toggle { display: flex; justify-content: space-between; align-items: center; padding: 4px 0 6px; }
    .toggle span { font-size: 14px; color: #1B1B1F; }
    .switch { width: 38px; height: 22px; background: #d8d4ca; border-radius: 12px; position: relative; cursor: pointer; transition: background .18s; }
    .switch.on { background: var(--a2ui-color-accent); }
    .knob { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; background: #fff; border-radius: 50%; transition: transform .18s; box-shadow: 0 1px 2px rgba(0,0,0,0.15); }
    .switch.on .knob { transform: translateX(16px); }
    .cta { margin-top: 6px; padding: 11px 18px; border-radius: 999px; border: 0; background: var(--a2ui-color-accent); color: #fff; font: inherit; font-weight: 600; font-size: 14px; letter-spacing: .2px; cursor: pointer; box-shadow: 0 4px 12px -4px rgba(91, 108, 255, 0.5); transition: transform .08s; }
    .cta:active { transform: scale(0.98); }
    .suggestions { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
    .pill { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid #e5e1d8; border-radius: 12px; background: #faf7f1; color: #1B1B1F; font: inherit; font-size: 13px; line-height: 1.3; text-align: left; cursor: pointer; transition: background .15s, border-color .15s, transform .08s; }
    .pill:active { transform: scale(0.98); }
    .pill[aria-pressed="true"] { background: #fff; border-color: var(--a2ui-color-accent); box-shadow: 0 0 0 1px var(--a2ui-color-accent) inset; }
    .pill .icon { font-size: 14px; }
    .pill .label-line { font-weight: 600; font-size: 13px; }
    .pill .addr-line { color: #6b6973; font-size: 12px; margin-top: 2px; }
    .pill .text { display: flex; flex-direction: column; }
  `;constructor(){super(),this.values={}}render(){return L`
      ${this.fields.map(e=>this._renderField(e))}
      <button class="cta" @click=${this._submit}>Place order</button>
    `}_renderField(e){if(e.type===`toggle`){let t=!!this.values[e.name];return L`<div class="row toggle"><span>${e.label}</span>
        <div class="switch ${t?`on`:``}" @click=${()=>this._set(e.name,!t)}><div class="knob"></div></div>
      </div>`}if(e.type===`text`)return L`<div class="row"><div class="label">${e.label}</div>
        <textarea rows="2" maxlength=${e.max_length||200} @input=${t=>this._set(e.name,t.target.value)}></textarea>
      </div>`;if(e.type===`address`){let t=[{icon:`🏠`,label:`Home`,addr:`235 Pine St, Brooklyn NY 11201`},{icon:`🏢`,label:`Work`,addr:`14 Clement St, San Francisco CA 94118`},{icon:`✈️`,label:`Mom's place`,addr:`402 Mission St, Austin TX 78701`}],n=this.values[e.name]||``;return L`<div class="row"><div class="label">${e.label}</div>
        <div class="suggestions">
          ${t.map(t=>L`
            <button type="button" class="pill" aria-pressed=${n===t.addr}
                    @click=${()=>this._set(e.name,t.addr)}>
              <span class="icon">${t.icon}</span>
              <span class="text">
                <span class="label-line">${t.label}</span>
                <span class="addr-line">${t.addr}</span>
              </span>
            </button>
          `)}
        </div>
      </div>`}return L``}_set(e,t){this.values={...this.values,[e]:t}}_submit(){window.AndroidBridge?.onAction(JSON.stringify({component:`form`,values:this.values}))}};customElements.define(`a2ui-form`,be);var xe=class extends J{static properties={order_id:{},items:{type:Array},total:{type:Number},ship_date:{}};static styles=o`
    :host { display: block; margin: 0 12px; font-family: var(--a2ui-font-sans); background: #fff; border: 1px solid #ece8e0; border-radius: var(--a2ui-radius-md); padding: 16px; box-shadow: 0 1px 2px rgba(20, 18, 14, 0.04), 0 6px 16px -10px rgba(20, 18, 14, 0.08); }
    .badge { background: #e7f6e7; color: #2d6a2d; font-weight: 600; font-size: 13px; padding: 5px 12px; border-radius: 999px; display: inline-block; margin-bottom: 10px; }
    .row { display: flex; justify-content: space-between; padding: 7px 0; font-size: 14px; color: #1B1B1F; }
    .row span:last-child { font-family: var(--a2ui-font-serif); font-weight: 600; }
    .total { border-top: 1px solid #ece8e0; margin-top: 6px; padding-top: 10px; font-weight: 600; font-size: 15px; }
    .total span:last-child { font-size: 16px; }
    .meta { color: #8a8790; font-size: 12px; margin-top: 8px; letter-spacing: .2px; }
  `;render(){return L`
      <div class="badge">✓ Order placed</div>
      ${this.items.map(e=>L`<div class="row"><span>${e.label}</span><span>$${e.amount}</span></div>`)}
      <div class="row total"><span>Total</span><span>$${this.total}</span></div>
      <div class="meta">Arrives ${this.ship_date} · #${this.order_id}</div>
    `}};customElements.define(`a2ui-confirmation-card`,xe);var Se={"chip-group":`a2ui-chip-group`,"card-grid":`a2ui-card-grid`,"product-detail":`a2ui-product-detail`,form:`a2ui-form`,"confirmation-card":`a2ui-confirmation-card`};function Y(){return document.getElementById(`a2ui-root`)}function X(e){window.AndroidBridge?.log&&window.AndroidBridge.log(e)}async function Ce(e){let t=Y();if(!t)return;X(`render: component=${e.component}`),Z=-1,t.innerHTML=``;let n=Se[e.component];if(!n){t.textContent=`unknown component: ${e.component}`,Q();return}let r=document.createElement(n);for(let[t,n]of Object.entries(e))t!==`component`&&(r[t]=n);t.appendChild(r),r.updateComplete&&await r.updateComplete,Q(),r.addEventListener(`load`,Q,!0),r.addEventListener(`error`,Q,!0);let i=0,a=setInterval(()=>{Q(),++i>10&&clearInterval(a)},80)}function we(e){for(let[t,n]of Object.entries(e))document.documentElement.style.setProperty(`--a2ui-${t}`,n)}var Z=-1;function Q(){let e=Y();if(!e)return;let t=e.scrollHeight,n=e.offsetHeight,r=Math.max(t,n)+12,i=Math.max(60,r),a=window.devicePixelRatio||1,o=Math.ceil(i*a);X(`reportSize: cssH=${i} dpr=${a} -> ${o}px`),o!==Z&&(Z=o,window.AndroidBridge?.onResize&&window.AndroidBridge.onResize(o),window.parent?.postMessage({type:`a2ui:resize`,height:o},`*`))}var $=()=>{let e=Y();e&&new ResizeObserver(Q).observe(e)};document.readyState===`loading`?document.addEventListener(`DOMContentLoaded`,$,{once:!0}):$(),window.a2ui={render:Ce,applyTheme:we}})();