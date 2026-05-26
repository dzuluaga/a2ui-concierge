var A2UIHost=(function(e){Object.defineProperty(e,Symbol.toStringTag,{value:`Module`});var t=globalThis,n=t.ShadowRoot&&(t.ShadyCSS===void 0||t.ShadyCSS.nativeShadow)&&`adoptedStyleSheets`in Document.prototype&&`replace`in CSSStyleSheet.prototype,r=Symbol(),i=new WeakMap,a=class{constructor(e,t,n){if(this._$cssResult$=!0,n!==r)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o,t=this.t;if(n&&e===void 0){let n=t!==void 0&&t.length===1;n&&(e=i.get(t)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),n&&i.set(t,e))}return e}toString(){return this.cssText}},o=e=>new a(typeof e==`string`?e:e+``,void 0,r),s=(e,...t)=>new a(e.length===1?e[0]:t.reduce((t,n,r)=>t+(e=>{if(!0===e._$cssResult$)return e.cssText;if(typeof e==`number`)return e;throw Error(`Value passed to 'css' function must be a 'css' function result: `+e+`. Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.`)})(n)+e[r+1],e[0]),e,r),c=(e,r)=>{if(n)e.adoptedStyleSheets=r.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(let n of r){let r=document.createElement(`style`),i=t.litNonce;i!==void 0&&r.setAttribute(`nonce`,i),r.textContent=n.cssText,e.appendChild(r)}},l=n?e=>e:e=>e instanceof CSSStyleSheet?(e=>{let t=``;for(let n of e.cssRules)t+=n.cssText;return o(t)})(e):e,{is:u,defineProperty:d,getOwnPropertyDescriptor:ee,getOwnPropertyNames:te,getOwnPropertySymbols:ne,getPrototypeOf:re}=Object,f=globalThis,p=f.trustedTypes,ie=p?p.emptyScript:``,ae=f.reactiveElementPolyfillSupport,m=(e,t)=>e,h={toAttribute(e,t){switch(t){case Boolean:e=e?ie:null;break;case Object:case Array:e=e==null?e:JSON.stringify(e)}return e},fromAttribute(e,t){let n=e;switch(t){case Boolean:n=e!==null;break;case Number:n=e===null?null:Number(e);break;case Object:case Array:try{n=JSON.parse(e)}catch{n=null}}return n}},g=(e,t)=>!u(e,t),_={attribute:!0,type:String,converter:h,reflect:!1,useDefault:!1,hasChanged:g};Symbol.metadata??=Symbol(`metadata`),f.litPropertyMetadata??=new WeakMap;var v=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=_){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){let n=Symbol(),r=this.getPropertyDescriptor(e,n,t);r!==void 0&&d(this.prototype,e,r)}}static getPropertyDescriptor(e,t,n){let{get:r,set:i}=ee(this.prototype,e)??{get(){return this[t]},set(e){this[t]=e}};return{get:r,set(t){let a=r?.call(this);i?.call(this,t),this.requestUpdate(e,a,n)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??_}static _$Ei(){if(this.hasOwnProperty(m(`elementProperties`)))return;let e=re(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(m(`finalized`)))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(m(`properties`))){let e=this.properties,t=[...te(e),...ne(e)];for(let n of t)this.createProperty(n,e[n])}let e=this[Symbol.metadata];if(e!==null){let t=litPropertyMetadata.get(e);if(t!==void 0)for(let[e,n]of t)this.elementProperties.set(e,n)}this._$Eh=new Map;for(let[e,t]of this.elementProperties){let n=this._$Eu(e,t);n!==void 0&&this._$Eh.set(n,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){let t=[];if(Array.isArray(e)){let n=new Set(e.flat(1/0).reverse());for(let e of n)t.unshift(l(e))}else e!==void 0&&t.push(l(e));return t}static _$Eu(e,t){let n=t.attribute;return!1===n?void 0:typeof n==`string`?n:typeof e==`string`?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),this.renderRoot!==void 0&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){let e=new Map,t=this.constructor.elementProperties;for(let n of t.keys())this.hasOwnProperty(n)&&(e.set(n,this[n]),delete this[n]);e.size>0&&(this._$Ep=e)}createRenderRoot(){let e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return c(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,n){this._$AK(e,n)}_$ET(e,t){let n=this.constructor.elementProperties.get(e),r=this.constructor._$Eu(e,n);if(r!==void 0&&!0===n.reflect){let i=(n.converter?.toAttribute===void 0?h:n.converter).toAttribute(t,n.type);this._$Em=e,i==null?this.removeAttribute(r):this.setAttribute(r,i),this._$Em=null}}_$AK(e,t){let n=this.constructor,r=n._$Eh.get(e);if(r!==void 0&&this._$Em!==r){let e=n.getPropertyOptions(r),i=typeof e.converter==`function`?{fromAttribute:e.converter}:e.converter?.fromAttribute===void 0?h:e.converter;this._$Em=r;let a=i.fromAttribute(t,e.type);this[r]=a??this._$Ej?.get(r)??a,this._$Em=null}}requestUpdate(e,t,n,r=!1,i){if(e!==void 0){let a=this.constructor;if(!1===r&&(i=this[e]),n??=a.getPropertyOptions(e),!((n.hasChanged??g)(i,t)||n.useDefault&&n.reflect&&i===this._$Ej?.get(e)&&!this.hasAttribute(a._$Eu(e,n))))return;this.C(e,t,n)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(e,t,{useDefault:n,reflect:r,wrapped:i},a){n&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,a??t??this[e]),!0!==i||a!==void 0)||(this._$AL.has(e)||(this.hasUpdated||n||(t=void 0),this._$AL.set(e,t)),!0===r&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}let e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[e,t]of this._$Ep)this[e]=t;this._$Ep=void 0}let e=this.constructor.elementProperties;if(e.size>0)for(let[t,n]of e){let{wrapped:e}=n,r=this[t];!0!==e||this._$AL.has(t)||r===void 0||this.C(t,void 0,n,r)}}let e=!1,t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(t)):this._$EM()}catch(t){throw e=!1,this._$EM(),t}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(e){}firstUpdated(e){}};v.elementStyles=[],v.shadowRootOptions={mode:`open`},v[m(`elementProperties`)]=new Map,v[m(`finalized`)]=new Map,ae?.({ReactiveElement:v}),(f.reactiveElementVersions??=[]).push(`2.1.2`);var y=globalThis,oe=e=>e,b=y.trustedTypes,se=b?b.createPolicy(`lit-html`,{createHTML:e=>e}):void 0,ce=`$lit$`,x=`lit$${Math.random().toFixed(9).slice(2)}$`,le=`?`+x,ue=`<${le}>`,S=document,C=()=>S.createComment(``),w=e=>e===null||typeof e!=`object`&&typeof e!=`function`,T=Array.isArray,de=e=>T(e)||typeof e?.[Symbol.iterator]==`function`,E=`[ 	
\f\r]`,D=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,O=/-->/g,k=/>/g,A=RegExp(`>|${E}(?:([^\\s"'>=/]+)(${E}*=${E}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,`g`),fe=/'/g,pe=/"/g,me=/^(?:script|style|textarea|title)$/i,j=(e=>(t,...n)=>({_$litType$:e,strings:t,values:n}))(1),M=Symbol.for(`lit-noChange`),N=Symbol.for(`lit-nothing`),P=new WeakMap,F=S.createTreeWalker(S,129);function I(e,t){if(!T(e)||!e.hasOwnProperty(`raw`))throw Error(`invalid template strings array`);return se===void 0?t:se.createHTML(t)}var he=(e,t)=>{let n=e.length-1,r=[],i,a=t===2?`<svg>`:t===3?`<math>`:``,o=D;for(let t=0;t<n;t++){let n=e[t],s,c,l=-1,u=0;for(;u<n.length&&(o.lastIndex=u,c=o.exec(n),c!==null);)u=o.lastIndex,o===D?c[1]===`!--`?o=O:c[1]===void 0?c[2]===void 0?c[3]!==void 0&&(o=A):(me.test(c[2])&&(i=RegExp(`</`+c[2],`g`)),o=A):o=k:o===A?c[0]===`>`?(o=i??D,l=-1):c[1]===void 0?l=-2:(l=o.lastIndex-c[2].length,s=c[1],o=c[3]===void 0?A:c[3]===`"`?pe:fe):o===pe||o===fe?o=A:o===O||o===k?o=D:(o=A,i=void 0);let d=o===A&&e[t+1].startsWith(`/>`)?` `:``;a+=o===D?n+ue:l>=0?(r.push(s),n.slice(0,l)+ce+n.slice(l)+x+d):n+x+(l===-2?t:d)}return[I(e,a+(e[n]||`<?>`)+(t===2?`</svg>`:t===3?`</math>`:``)),r]},L=class e{constructor({strings:t,_$litType$:n},r){let i;this.parts=[];let a=0,o=0,s=t.length-1,c=this.parts,[l,u]=he(t,n);if(this.el=e.createElement(l,r),F.currentNode=this.el.content,n===2||n===3){let e=this.el.content.firstChild;e.replaceWith(...e.childNodes)}for(;(i=F.nextNode())!==null&&c.length<s;){if(i.nodeType===1){if(i.hasAttributes())for(let e of i.getAttributeNames())if(e.endsWith(ce)){let t=u[o++],n=i.getAttribute(e).split(x),r=/([.?@])?(.*)/.exec(t);c.push({type:1,index:a,name:r[2],strings:n,ctor:r[1]===`.`?_e:r[1]===`?`?ve:r[1]===`@`?ye:B}),i.removeAttribute(e)}else e.startsWith(x)&&(c.push({type:6,index:a}),i.removeAttribute(e));if(me.test(i.tagName)){let e=i.textContent.split(x),t=e.length-1;if(t>0){i.textContent=b?b.emptyScript:``;for(let n=0;n<t;n++)i.append(e[n],C()),F.nextNode(),c.push({type:2,index:++a});i.append(e[t],C())}}}else if(i.nodeType===8)if(i.data===le)c.push({type:2,index:a});else{let e=-1;for(;(e=i.data.indexOf(x,e+1))!==-1;)c.push({type:7,index:a}),e+=x.length-1}a++}}static createElement(e,t){let n=S.createElement(`template`);return n.innerHTML=e,n}};function R(e,t,n=e,r){if(t===M)return t;let i=r===void 0?n._$Cl:n._$Co?.[r],a=w(t)?void 0:t._$litDirective$;return i?.constructor!==a&&(i?._$AO?.(!1),a===void 0?i=void 0:(i=new a(e),i._$AT(e,n,r)),r===void 0?n._$Cl=i:(n._$Co??=[])[r]=i),i!==void 0&&(t=R(e,i._$AS(e,t.values),i,r)),t}var ge=class{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){let{el:{content:t},parts:n}=this._$AD,r=(e?.creationScope??S).importNode(t,!0);F.currentNode=r;let i=F.nextNode(),a=0,o=0,s=n[0];for(;s!==void 0;){if(a===s.index){let t;s.type===2?t=new z(i,i.nextSibling,this,e):s.type===1?t=new s.ctor(i,s.name,s.strings,this,e):s.type===6&&(t=new be(i,this,e)),this._$AV.push(t),s=n[++o]}a!==s?.index&&(i=F.nextNode(),a++)}return F.currentNode=S,r}p(e){let t=0;for(let n of this._$AV)n!==void 0&&(n.strings===void 0?n._$AI(e[t]):(n._$AI(e,n,t),t+=n.strings.length-2)),t++}},z=class e{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,n,r){this.type=2,this._$AH=N,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=n,this.options=r,this._$Cv=r?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode,t=this._$AM;return t!==void 0&&e?.nodeType===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=R(this,e,t),w(e)?e===N||e==null||e===``?(this._$AH!==N&&this._$AR(),this._$AH=N):e!==this._$AH&&e!==M&&this._(e):e._$litType$===void 0?e.nodeType===void 0?de(e)?this.k(e):this._(e):this.T(e):this.$(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==N&&w(this._$AH)?this._$AA.nextSibling.data=e:this.T(S.createTextNode(e)),this._$AH=e}$(e){let{values:t,_$litType$:n}=e,r=typeof n==`number`?this._$AC(e):(n.el===void 0&&(n.el=L.createElement(I(n.h,n.h[0]),this.options)),n);if(this._$AH?._$AD===r)this._$AH.p(t);else{let e=new ge(r,this),n=e.u(this.options);e.p(t),this.T(n),this._$AH=e}}_$AC(e){let t=P.get(e.strings);return t===void 0&&P.set(e.strings,t=new L(e)),t}k(t){T(this._$AH)||(this._$AH=[],this._$AR());let n=this._$AH,r,i=0;for(let a of t)i===n.length?n.push(r=new e(this.O(C()),this.O(C()),this,this.options)):r=n[i],r._$AI(a),i++;i<n.length&&(this._$AR(r&&r._$AB.nextSibling,i),n.length=i)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){let t=oe(e).nextSibling;oe(e).remove(),e=t}}setConnected(e){this._$AM===void 0&&(this._$Cv=e,this._$AP?.(e))}},B=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,n,r,i){this.type=1,this._$AH=N,this._$AN=void 0,this.element=e,this.name=t,this._$AM=r,this.options=i,n.length>2||n[0]!==``||n[1]!==``?(this._$AH=Array(n.length-1).fill(new String),this.strings=n):this._$AH=N}_$AI(e,t=this,n,r){let i=this.strings,a=!1;if(i===void 0)e=R(this,e,t,0),a=!w(e)||e!==this._$AH&&e!==M,a&&(this._$AH=e);else{let r=e,o,s;for(e=i[0],o=0;o<i.length-1;o++)s=R(this,r[n+o],t,o),s===M&&(s=this._$AH[o]),a||=!w(s)||s!==this._$AH[o],s===N?e=N:e!==N&&(e+=(s??``)+i[o+1]),this._$AH[o]=s}a&&!r&&this.j(e)}j(e){e===N?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??``)}},_e=class extends B{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===N?void 0:e}},ve=class extends B{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==N)}},ye=class extends B{constructor(e,t,n,r,i){super(e,t,n,r,i),this.type=5}_$AI(e,t=this){if((e=R(this,e,t,0)??N)===M)return;let n=this._$AH,r=e===N&&n!==N||e.capture!==n.capture||e.once!==n.once||e.passive!==n.passive,i=e!==N&&(n===N||r);r&&this.element.removeEventListener(this.name,this,n),i&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){typeof this._$AH==`function`?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}},be=class{constructor(e,t,n){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=n}get _$AU(){return this._$AM._$AU}_$AI(e){R(this,e)}},xe=y.litHtmlPolyfillSupport;xe?.(L,z),(y.litHtmlVersions??=[]).push(`3.3.2`);var Se=(e,t,n)=>{let r=n?.renderBefore??t,i=r._$litPart$;if(i===void 0){let e=n?.renderBefore??null;r._$litPart$=i=new z(t.insertBefore(C(),e),e,void 0,n??{})}return i._$AI(e),i},V=globalThis,H=class extends v{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){let t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=Se(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return M}};H._$litElement$=!0,H.finalized=!0,V.litElementHydrateSupport?.({LitElement:H});var Ce=V.litElementPolyfillSupport;Ce?.({LitElement:H}),(V.litElementVersions??=[]).push(`4.2.2`);var we=class extends H{static properties={section:{},reasoning:{},items:{type:Array},action:{type:Object}};static styles=s`
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
      scroll-snap-type: x proximity;
      scroll-snap-stop: always;
      scroll-padding-inline: 12px;
      padding: 4px 12px 8px;
      margin: 0;
      scrollbar-width: none;
      touch-action: pan-x;
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
  `;constructor(){super(),this.items=[],this.action={name:`card-grid`}}render(){return j`
      ${this.section?j`<div class="section">${this.section}</div>`:null}
      ${this.reasoning?j`<div class="reason">${this.reasoning}</div>`:null}
      <div class="rail">
        ${this.items.map(e=>{let t=e.salePrice!=null&&e.salePrice<e.price;return j`
            <div class="card" @click=${()=>this._tap(e)}>
              <img src=${e.imageUrl} alt=${e.name}>
              <div class="body">
                <div class="name">${e.name}</div>
                <div class="price-row">
                  <span class="price ${t?`sale`:``}">$${t?e.salePrice:e.price}</span>
                  ${t?j`<span class="price-orig">$${e.price}</span>`:null}
                </div>
                ${e.vendor?j`<div class="vendor">${e.vendor}</div>`:null}
                ${e.why?j`<div class="why">${e.why}</div>`:null}
              </div>
            </div>
          `})}
      </div>
    `}_tap(e){this.dispatchEvent(new CustomEvent(`a2ui-action`,{bubbles:!0,composed:!0,detail:{name:this.action?.name||`card-grid`,context:{product_id:e.id,name:e.name}}}))}};customElements.define(`a2ui-card-grid`,we);var Te=class extends H{static properties={product:{},variantGroups:{type:Array},requiresAgeVerification:{type:Boolean},action:{type:Object},selection:{state:!0},activeImage:{state:!0}};static styles=s`
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
    .age-notice {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 14px 16px 0;
      padding: 10px 12px;
      background: #fff8ec;
      border: 1px solid #f5d78e;
      border-radius: 10px;
    }
    .age-notice-icon { font-size: 16px; flex-shrink: 0; }
    .age-notice-text { font-size: 12px; color: #7a5c00; line-height: 1.4; }
    .age-notice-text strong { font-weight: 600; }
  `;constructor(){super(),this.variantGroups=[],this.action={name:`product-detail`},this.selection={},this.activeImage=0}firstUpdated(){let e=this.renderRoot.querySelector(`.gallery-track`);e&&e.addEventListener(`scroll`,()=>{let t=e.clientWidth||1,n=Math.round(e.scrollLeft/t);n!==this.activeImage&&(this.activeImage=n)},{passive:!0})}render(){let e=this.product||{},t=e.images&&e.images.length?e.images:[e.imageUrl].filter(Boolean),n=e.vendor||`Lumen Goods`,r=(n[0]||`L`).toUpperCase(),i=e.salePrice!=null&&e.salePrice<e.price;return j`
      <div class="gallery">
        <button class="close" aria-label="Close" @click=${this._close}>✕</button>
        <div class="gallery-track">
          ${t.map(t=>j`
            <div class="slide"><img src=${t} alt=${e.name||``}></div>
          `)}
        </div>
        ${t.length>1?j`
          <div class="dots">
            ${t.map((e,t)=>j`
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
            <div class="vendor-sub">${e.inStock===!1?`Out of stock`:`In stock`}</div>
          </div>
        </div>
        <div class="price-block">
          <span class="price ${i?`sale`:``}">$${i?e.salePrice:e.price}</span>
          ${i?j`<span class="price-orig">$${e.price}</span>`:null}
        </div>
      </div>

      ${e.description?j`<div class="description">${e.description}</div>`:null}

      ${this.requiresAgeVerification?j`
        <div class="age-notice">
          <span class="age-notice-icon">🪪</span>
          <span class="age-notice-text">
            <strong>Age verification required.</strong>
            You'll need to present a valid digital ID at checkout.
          </span>
        </div>
      `:null}

      ${(this.variantGroups||[]).map(e=>j`
        <div class="group">
          <div class="label">${e.name}</div>
          ${e.options.map(t=>j`
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
    `}_pick(e,t){this.selection={...this.selection,[e]:t}}_dispatch(e,t){this.dispatchEvent(new CustomEvent(`a2ui-action`,{bubbles:!0,composed:!0,detail:{name:e,context:t}}))}_confirm(){this._dispatch(this.action?.name||`product-detail`,{product_id:this.product?.id,name:this.product?.name,variants:this.selection})}_visit(){this._dispatch(`product-detail-visit`,{product_id:this.product?.id,name:this.product?.name,vendor:this.product?.vendor})}_followup(){this._dispatch(`product-detail-followup`,{product_id:this.product?.id,name:this.product?.name})}_close(){this._dispatch(`product-detail-close`,{})}};customElements.define(`a2ui-product-detail`,Te);var Ee=class extends H{static properties={orderId:{},label:{},amountDisplay:{},items:{type:Array},challenge:{type:Object},requiresAgeVerification:{type:Boolean},ageDcqlQueryJson:{},dpcDcqlQueryJson:{},loyaltyDiscountPct:{type:Number},loyaltyDcqlQueryJson:{},action:{type:Object},payment_method:{state:!0},status:{state:!0},age_status:{state:!0},loyalty_status:{state:!0},discount_amount:{state:!0},effective_total:{state:!0},effective_challenge:{state:!0},effective_order_id:{state:!0},error:{state:!0}};static styles=s`
    :host {
      display: block;
      position: relative;
      font-family: var(--a2ui-font-sans);
      background: #fff;
      border: 1px solid #ece8e0;
      border-radius: var(--a2ui-radius-md);
      padding: 16px;
      box-shadow: 0 1px 2px rgba(20,18,14,0.04), 0 6px 16px -10px rgba(20,18,14,0.08);
    }
    .close {
      position: absolute;
      top: 10px; right: 10px;
      width: 32px; height: 32px;
      border-radius: 999px; border: 0;
      background: #f4efe6; color: #1B1B1F;
      font: inherit; font-size: 15px; line-height: 1;
      display: grid; place-items: center;
      cursor: pointer; z-index: 2;
      transition: transform .08s, background .15s;
    }
    .close:active { transform: scale(0.94); background: #ece8e0; }
    .badge {
      display: inline-block;
      background: #f0eef9; color: #4a3aa0;
      font-size: 10px; font-weight: 600;
      letter-spacing: .4px; text-transform: uppercase;
      padding: 4px 10px; border-radius: 999px;
      margin-bottom: 10px;
    }
    .label { font-family: var(--a2ui-font-serif); font-weight: 600; font-size: 16px; color: #1B1B1F; line-height: 1.25; }
    .meta { font-size: 12px; color: #8a8790; margin-top: 4px; letter-spacing: .2px; }
    .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13.5px; color: #1B1B1F; }
    .row span:last-child { font-family: var(--a2ui-font-serif); font-weight: 600; }
    .summary { margin-top: 12px; padding-top: 10px; border-top: 1px solid #ece8e0; }
    .total { border-top: 1px solid #ece8e0; margin-top: 6px; padding-top: 10px; font-weight: 600; }
    .total .amt { font-size: 15px; }

    .age-section {
      margin-top: 14px;
      padding: 12px 14px;
      border-radius: 12px;
      border: 1px solid #ece8e0;
      background: #faf9f7;
    }
    .age-section.verified {
      border-color: #c3e6cb;
      background: #f4fdf6;
    }
    .age-section.failed {
      border-color: #f5c6cb;
      background: #fff5f5;
    }
    .age-row { display: flex; align-items: center; gap: 10px; }
    .age-icon { font-size: 20px; line-height: 1; flex-shrink: 0; }
    .age-text { flex: 1; }
    .age-title { font-size: 13px; font-weight: 600; color: #1B1B1F; }
    .age-subtitle { font-size: 11.5px; color: #8a8790; margin-top: 2px; }
    .age-subtitle.fail { color: #b22; }
    .verify-btn {
      margin-top: 10px;
      width: 100%;
      padding: 10px 14px;
      border-radius: 10px;
      border: 0;
      background: #1B1B1F;
      color: #fff;
      font: inherit;
      font-weight: 600;
      font-size: 13.5px;
      cursor: pointer;
      transition: transform .08s, opacity .15s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .verify-btn:active:not(:disabled) { transform: scale(0.985); }
    .verify-btn:disabled { opacity: .55; cursor: default; }

    .loyalty-section {
      margin-top: 14px;
      padding: 12px 14px;
      border-radius: 12px;
      border: 1.5px dashed #d4b96a;
      background: #fffbf0;
    }
    .loyalty-section.verified {
      border: 1.5px solid #c3a73a;
      background: #fffbf0;
    }
    .loyalty-row { display: flex; align-items: center; gap: 10px; }
    .loyalty-icon { font-size: 20px; flex-shrink: 0; line-height: 1; }
    .loyalty-text { flex: 1; }
    .loyalty-title { font-size: 13px; font-weight: 600; color: #1B1B1F; }
    .loyalty-subtitle { font-size: 11.5px; color: #8a8790; margin-top: 2px; }
    .loyalty-pill {
      font-size: 10px; font-weight: 700; letter-spacing: .3px;
      text-transform: uppercase; padding: 3px 8px;
      border-radius: 999px; background: #f5d87a; color: #6b4e00;
      flex-shrink: 0;
    }
    .loyalty-btn {
      margin-top: 10px; width: 100%;
      padding: 10px 14px; border-radius: 10px; border: 0;
      background: #1B1B1F; color: #fff;
      font: inherit; font-weight: 600; font-size: 13.5px;
      cursor: pointer; transition: transform .08s, opacity .15s;
      display: flex; align-items: center; justify-content: center; gap: 6px;
    }
    .loyalty-btn:active:not(:disabled) { transform: scale(0.985); }
    .loyalty-btn:disabled { opacity: .55; cursor: default; }
    .loyalty-discount-row {
      display: flex; justify-content: space-between;
      padding: 6px 0; font-size: 13.5px; color: #2d7a2d; font-weight: 600;
    }

    .method-section { margin-top: 16px; }
    .section-label {
      font-size: 10.5px;
      color: #8a8790;
      text-transform: uppercase;
      letter-spacing: .8px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .method-cards { display: flex; flex-direction: column; gap: 8px; }
    .method-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 12px;
      border: 1.5px solid #ece8e0;
      background: #faf9f7;
      cursor: pointer;
      transition: border-color .15s, background .15s, transform .08s;
      text-align: left;
      width: 100%;
      font: inherit;
    }
    .method-card.selected {
      border-color: var(--a2ui-color-accent, #5B6CFF);
      background: #f0f1ff;
    }
    .method-card:active { transform: scale(0.99); }
    .method-card:disabled { opacity: .55; cursor: default; }
    .method-icon {
      font-size: 22px;
      flex-shrink: 0;
      width: 32px;
      text-align: center;
      line-height: 1;
    }
    .method-info { flex: 1; min-width: 0; }
    .method-name { font-size: 13.5px; font-weight: 600; color: #1B1B1F; }
    .method-desc { font-size: 11.5px; color: #8a8790; margin-top: 2px; }
    .method-check {
      width: 20px; height: 20px;
      border-radius: 999px;
      border: 1.5px solid #ccc;
      display: grid;
      place-items: center;
      flex-shrink: 0;
      font-size: 11px;
      transition: background .15s, border-color .15s, color .15s;
    }
    .method-card.selected .method-check {
      background: var(--a2ui-color-accent, #5B6CFF);
      border-color: var(--a2ui-color-accent, #5B6CFF);
      color: #fff;
    }

    .pay {
      margin-top: 14px; width: 100%;
      padding: 13px 18px; border-radius: 14px; border: 0;
      background: #1B1B1F; color: #fff;
      font: inherit; font-weight: 600; font-size: 14.5px;
      cursor: pointer;
      box-shadow: 0 6px 18px -8px rgba(20,18,14,0.5);
      transition: transform .08s, opacity .15s;
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .pay:active:not(:disabled) { transform: scale(0.985); }
    .pay:disabled { opacity: .45; cursor: default; box-shadow: none; }
    .hint { margin-top: 8px; font-size: 11.5px; color: #8a8790; text-align: center; line-height: 1.5; }
    .err { margin-top: 10px; font-size: 12px; color: #b22; }
    .dot { width: 8px; height: 8px; border-radius: 999px; background: #5B6CFF; box-shadow: 0 0 0 4px rgba(91,108,255,0.18); }
  `;constructor(){super(),this.items=[],this.action={name:`payment-challenge`},this.payment_method=null,this.status=`idle`,this.age_status=`idle`,this.loyalty_status=`idle`,this.discount_amount=0,this.effective_total=null,this.effective_challenge=null,this.effective_order_id=null,this.error=``}get _orderId(){return this.effective_order_id??this.orderId}get _challenge(){return this.effective_challenge??this.challenge}get _payEnabled(){return!this.payment_method||this.requiresAgeVerification&&this.age_status!==`verified`?!1:this.status===`idle`||this.status===`error`}get _payLabel(){return this.status===`dpc_pending`?`Authorizing card…`:this.status===`paying`?this.payment_method===`usdc`?`Settling on-chain…`:`Processing payment…`:this.status===`done`?`Paid ✓`:this.payment_method?this.payment_method===`card`?`Pay with Card`:`Pay ${this.amountDisplay} · USDC`:`Select a payment method`}get _hint(){return this.payment_method?this.payment_method===`card`?`Your digital payment card is presented securely via Android Credential Manager.`:`On Android, payment is signed with your StrongBox-backed wallet key (EIP-3009).`:`Choose a payment method above to continue.`}render(){let e=this.effective_total==null?this.amountDisplay:`$${this.effective_total.toFixed(2)}`;return j`
      <button class="close" aria-label="Close" @click=${this._close}>✕</button>
      <div class="badge">Payment</div>
      <div class="label">${this.label||`Confirm payment`}</div>
      <div class="meta">${this._challenge?.network||``} · ${e}</div>

      <div class="summary">
        ${(this.items||[]).map(e=>j`
          <div class="row"><span>${e.label}</span><span>$${e.amount.toFixed(2)}</span></div>
        `)}
        ${this.discount_amount>0?j`
          <div class="loyalty-discount-row">
            <span>Loyalty discount (10%)</span><span>−$${this.discount_amount.toFixed(2)}</span>
          </div>
        `:null}
        <div class="row total"><span>Total</span><span class="amt">${e}</span></div>
      </div>

      ${this.requiresAgeVerification?this._renderAgeSection():null}
      ${this.loyaltyDiscountPct?this._renderLoyaltySection():null}
      ${this._renderMethodSection()}

      <button
        class="pay"
        ?disabled=${!this._payEnabled}
        @click=${this._pay}
      >
        ${this.status===`idle`||this.status===`error`?j`<span class="dot"></span>`:null}
        ${this._payLabel}
      </button>
      ${this.error?j`<div class="err">${this.error}</div>`:null}
      <div class="hint">${this._hint}</div>
    `}_renderAgeSection(){let e=this.age_status;return e===`verified`?j`
        <div class="age-section verified">
          <div class="age-row">
            <div class="age-icon">✅</div>
            <div class="age-text">
              <div class="age-title">Age verified</div>
              <div class="age-subtitle">Your digital ID was confirmed</div>
            </div>
          </div>
        </div>`:j`
      <div class="age-section ${e===`failed`?`failed`:``}">
        <div class="age-row">
          <div class="age-icon">${e===`failed`?`❌`:`🪪`}</div>
          <div class="age-text">
            <div class="age-title">Age verification required</div>
            <div class="age-subtitle ${e===`failed`?`fail`:``}">
              ${e===`failed`?`Verification failed. Please try again.`:`This product requires proof of age to purchase.`}
            </div>
          </div>
        </div>
        <button
          class="verify-btn"
          ?disabled=${e===`verifying`}
          @click=${this._verifyAge}
        >
          ${e===`verifying`?`Verifying…`:e===`failed`?`Try again`:`Verify Age with Wallet`}
        </button>
      </div>`}_renderMethodSection(){let e=this.status===`paying`||this.status===`dpc_pending`||this.status===`done`;return j`
      <div class="method-section">
        <div class="section-label">Payment method</div>
        <div class="method-cards">
          ${this._renderMethodCard(`card`,`💳`,`Card Wallet`,`Pay with your digital payment credential`,e)}
          ${this._renderMethodCard(`usdc`,`⟠`,`USDC on Base`,`On-chain transfer · no card needed`,e)}
        </div>
      </div>`}_renderMethodCard(e,t,n,r,i){let a=this.payment_method===e;return j`
      <button
        class="method-card ${a?`selected`:``}"
        ?disabled=${i}
        @click=${()=>this._selectMethod(e)}
      >
        <div class="method-icon">${t}</div>
        <div class="method-info">
          <div class="method-name">${n}</div>
          <div class="method-desc">${r}</div>
        </div>
        <div class="method-check">${a?`✓`:``}</div>
      </button>`}_selectMethod(e){this.status===`paying`||this.status===`dpc_pending`||this.status===`done`||(this.payment_method=e,this.status=`idle`,this.error=``)}_renderLoyaltySection(){let e=this.loyalty_status;return e===`verified`?j`
        <div class="loyalty-section verified">
          <div class="loyalty-row">
            <div class="loyalty-icon">🎫</div>
            <div class="loyalty-text">
              <div class="loyalty-title">Loyalty discount applied</div>
              <div class="loyalty-subtitle">10% off your order total</div>
            </div>
            <div class="loyalty-pill">−10%</div>
          </div>
        </div>`:j`
      <div class="loyalty-section ${e===`failed`?`border-red`:``}">
        <div class="loyalty-row">
          <div class="loyalty-icon">🎫</div>
          <div class="loyalty-text">
            <div class="loyalty-title">Lumen Member? Save 10%</div>
            <div class="loyalty-subtitle">
              ${e===`failed`?`Could not verify membership. Try again or skip.`:`Present your digital membership card for an instant discount.`}
            </div>
          </div>
          <div class="loyalty-pill">${this.loyaltyDiscountPct}% off</div>
        </div>
        <button
          class="loyalty-btn"
          ?disabled=${e===`verifying`}
          @click=${this._applyLoyalty}
        >
          ${e===`verifying`?`Verifying…`:e===`failed`?`Try again`:`Apply Member Discount`}
        </button>
      </div>`}_dispatch(e,t){this.dispatchEvent(new CustomEvent(`a2ui-action`,{bubbles:!0,composed:!0,detail:{name:e,context:t}}))}_close(){this._dispatch(`payment-challenge-close`,{})}async _applyLoyalty(){if(this.loyalty_status=`verifying`,this.error=``,window.AndroidBridge?.applyLoyalty){let e=`__loyalty_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;window[e]=t=>{if(delete window[e],!t||t.cancelled||t.error){this.loyalty_status=`failed`;return}this._onLoyaltyApplied(t)};try{window.AndroidBridge.applyLoyalty(this._orderId,this.loyaltyDcqlQueryJson||``,e)}catch{delete window[e],this.loyalty_status=`failed`}}else try{let e=await fetch(`/loyalty/apply`,{method:`POST`,headers:{"content-type":`application/json`},body:JSON.stringify({order_id:this._orderId})});if(!e.ok)throw Error(`HTTP ${e.status}`);let t=await e.json();this._onLoyaltyApplied(t)}catch{this.loyalty_status=`failed`}}_onLoyaltyApplied(e){this.loyalty_status=`verified`,this.discount_amount=e.discount_amount??0,this.effective_total=e.new_total??null,e.new_order_id&&(this.effective_order_id=e.new_order_id),e.new_challenge&&(this.effective_challenge=e.new_challenge)}async _verifyAge(){if(this.age_status=`verifying`,this.error=``,window.AndroidBridge?.verifyAge){let e=`__verifyAge_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;window[e]=t=>{delete window[e],this.age_status=t?`verified`:`failed`};try{window.AndroidBridge.verifyAge(this.ageDcqlQueryJson||``,e)}catch{delete window[e],this.age_status=`failed`}}else await new Promise(e=>setTimeout(e,800)),this.age_status=`verified`}async _pay(){this._payEnabled&&(this.error=``,this.payment_method===`card`?await this._payWithCard():await this._payWithUsdc())}async _payWithCard(){if(this.status=`dpc_pending`,!await this._requestDpc()){this.status=`error`,this.error=`Payment authorization was cancelled or declined.`;return}this.status=`paying`;try{let e=await this._settleDpc();this.status=`done`,this._dispatch(`payment-completed`,{order_id:this._orderId,tx_hash:e.tx_hash,explorer_url:e.explorer_url??null})}catch(e){this.status=`error`,this.error=e.message||String(e)}}_settleDpc(){return window.AndroidBridge?.settleDpc?new Promise((e,t)=>{let n=`__dpcSettle_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;window[n]=r=>{if(delete window[n],!r)return t(Error(`empty bridge response`));if(r.error)return t(Error(r.error));e(r)};try{window.AndroidBridge.settleDpc(this._orderId,n)}catch(e){delete window[n],t(e)}}):fetch(`/dpc/settle`,{method:`POST`,headers:{"content-type":`application/json`},body:JSON.stringify({order_id:this._orderId})}).then(e=>e.ok?e.json():e.text().then(t=>{throw Error(`HTTP ${e.status}: ${t}`)}))}async _payWithUsdc(){this.status=`paying`;try{let e=await this._settle();this.status=`done`,this._dispatch(`payment-completed`,{order_id:this._orderId,tx_hash:e.tx_hash,explorer_url:e.explorer_url??null})}catch(e){this.status=`error`,this.error=e.message||String(e)}}_requestDpc(){return new Promise(e=>{if(window.AndroidBridge?.verifyDpc){let t=`__dpc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;window[t]=n=>{delete window[t],e(!!n)};try{window.AndroidBridge.verifyDpc(this.dpcDcqlQueryJson||``,t)}catch{delete window[t],e(!1)}}else setTimeout(()=>e(!0),600)})}async _settle(){if(window.AndroidBridge?.settle)return new Promise((e,t)=>{let n=`__settle_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;window[n]=r=>{if(delete window[n],!r)return t(Error(`empty bridge response`));if(r.error)return t(Error(r.error));e(r)};try{window.AndroidBridge.settle(this._orderId,JSON.stringify(this._challenge||{}),n)}catch(e){delete window[n],t(e)}});let e={scheme:`exact`,kind:`stub-web`,order_id:this._orderId,nonce:this._challenge?.nonce},t=await fetch(`/x402/settle`,{method:`POST`,headers:{"content-type":`application/json`},body:JSON.stringify({order_id:this._orderId,envelope:e})});if(!t.ok){let e=await t.text().catch(()=>``);throw Error(`HTTP ${t.status}: ${e}`)}return await t.json()}};customElements.define(`a2ui-payment-challenge`,Ee);var De=`lumen.com:concierge/v1`,Oe=`https://a2ui.org/specification/v0_8/standard_catalog_definition.json`,ke={CardGrid:`a2ui-card-grid`,ProductDetail:`a2ui-product-detail`,PaymentChallenge:`a2ui-payment-challenge`},U=new Map;function W(){return document.getElementById(`a2ui-root`)}function G(e){window.AndroidBridge?.log&&window.AndroidBridge.log(e)}function Ae(e){if(e!=null){if(typeof e==`string`)try{e=JSON.parse(e)}catch(e){G(`ingest parse error: ${e}`);return}if(Array.isArray(e)){for(let t of e)Ae(t);return}e.surfaceUpdate?je(e.surfaceUpdate):e.dataModelUpdate?Me(e.dataModelUpdate):e.beginRendering?Pe(e.beginRendering):e.deleteSurface?Fe(e.deleteSurface):G(`ingest: unknown message keys ${Object.keys(e).join(`,`)}`)}}function K(e){let t=U.get(e);return t||(t={surfaceId:e,components:new Map,dataModel:{}},U.set(e,t)),t}function je({surfaceId:e,components:t}){let n=K(e);for(let e of t||[])e&&e.id&&n.components.set(e.id,e);G(`surfaceUpdate: ${e} components=${(t||[]).length}`)}function Me({surfaceId:e,path:t,contents:n}){let r=K(e),i=(n||[]).reduce((e,t)=>(!t||typeof t.key!=`string`||(`valueString`in t?e[t.key]=t.valueString:`valueNumber`in t?e[t.key]=t.valueNumber:`valueBoolean`in t?e[t.key]=t.valueBoolean:`valueMap`in t&&(e[t.key]=Ne(t.valueMap))),e),{});!t||t===`/`?r.dataModel=i:Z(r.dataModel,t,i),r.root&&Ie(e)}function Ne(e){let t={};for(let n of e||[])!n||typeof n.key!=`string`||(`valueString`in n?t[n.key]=n.valueString:`valueNumber`in n?t[n.key]=n.valueNumber:`valueBoolean`in n&&(t[n.key]=n.valueBoolean));return t}function Pe({surfaceId:e,root:t,catalogId:n,styles:r}){let i=K(e);if(i.root=t,i.catalogId=n||`lumen.com:concierge/v1`,r&&Qe(r),i.catalogId!==`lumen.com:concierge/v1`&&i.catalogId!==`https://a2ui.org/specification/v0_8/standard_catalog_definition.json`){G(`beginRendering: unsupported catalogId=${i.catalogId} — ignoring`);let t=W();t&&t.dataset.surfaceId===e&&(t.innerHTML=``,delete t.dataset.surfaceId);return}Ie(e)}function Fe({surfaceId:e}){U.delete(e);let t=W();t&&t.dataset.surfaceId===e&&(t.innerHTML=``)}function Ie(e){let t=W();if(!t)return;let n=U.get(e);if(!n||!n.root)return;let r=n.components.get(n.root);if(!r){G(`renderSurface: root ${n.root} not in buffer`);return}Q=-1,t.innerHTML=``,t.dataset.surfaceId=e;let i=Re(r,n);if(!i){t.textContent=`unknown component type: ${Le(r)}`,$();return}n.catalogId===`https://a2ui.org/specification/v0_8/standard_catalog_definition.json`&&i.classList.add(`a2ui-std-root`),t.appendChild(i),qe(i)}function Le(e){return!e||!e.component?`<no component>`:Object.keys(e.component)[0]||`<empty>`}function Re(e,t){let n=Object.entries(e.component||{})[0];if(!n)return null;let[r,i]=n;if(t.catalogId===`https://a2ui.org/specification/v0_8/standard_catalog_definition.json`)return Ue(r,i,e.id,t);let a=ke[r];if(!a)return null;let o=document.createElement(a);o._a2uiType=r,o._a2uiSurfaceId=t.surfaceId,o._a2uiSourceComponentId=e.id;let s=X(i,t);if(s&&typeof s==`object`)for(let[e,t]of Object.entries(s))o[e]=t;return o}function q(e,t){if(!e)return null;let n=t.components.get(e);return n?Re(n,t):null}function ze(e,t,n){if(t&&Array.isArray(t.explicitList))for(let r of t.explicitList){let t=q(r,n);t&&e.appendChild(t)}}function Be(e){return{start:`flex-start`,center:`center`,end:`flex-end`,spaceAround:`space-around`,spaceBetween:`space-between`,spaceEvenly:`space-evenly`}[e]||`flex-start`}function Ve(e,t){return{start:`flex-start`,center:`center`,end:`flex-end`,stretch:`stretch`}[e]||t||`flex-start`}var He={h1:`h1`,h2:`h2`,h3:`h3`,h4:`h4`,h5:`h5`,caption:`small`,body:`span`};function J(e){return e&&typeof e==`object`&&typeof e.path==`string`}function Y(e,t,n){J(t)&&Ze(e.dataModel,t.path)===void 0&&Z(e.dataModel,t.path,n)}function Ue(e,t,n,r){Ke(),t||={};let i=null;switch(e){case`Text`:{let e=X(t.text,r),n=t.usageHint||`body`;i=document.createElement(He[n]||`span`),i.className=`a2ui-std-text a2ui-std-text-${n}`,i.textContent=e==null?``:String(e);break}case`Image`:{i=document.createElement(`img`),i.className=`a2ui-std-image`,i.src=X(t.url,r)||``;let e=X(t.altText,r);e&&(i.alt=e),t.fit&&(i.style.objectFit=t.fit),t.usageHint&&i.classList.add(`a2ui-std-image-${t.usageHint}`);break}case`Icon`:{i=document.createElement(`span`),i.className=`a2ui-std-icon`;let e=X(t.name,r)||``;i.dataset.icon=e,i.setAttribute(`aria-label`,e),i.textContent=We[e]||`•`;break}case`Row`:case`Column`:case`List`:i=document.createElement(`div`),i.className=e===`Row`?`a2ui-std-row`:e===`Column`?`a2ui-std-col`:t.direction===`horizontal`?`a2ui-std-row`:`a2ui-std-col`,i.style.justifyContent=Be(t.distribution),i.style.alignItems=Ve(t.alignment,e===`Row`?`center`:`stretch`),ze(i,t.children,r);break;case`Card`:{i=document.createElement(`div`),i.className=`a2ui-std-card`;let e=q(t.child,r);e&&i.appendChild(e);break}case`Divider`:i=document.createElement(`hr`),i.className=`a2ui-std-divider ${t.axis===`vertical`?`vertical`:`horizontal`}`;break;case`Button`:{i=document.createElement(`button`),i.type=`button`,i.className=`a2ui-std-btn`+(t.primary?` primary`:``);let e=q(t.child,r);e&&i.appendChild(e);let n=t.action,a=!1;i.addEventListener(`click`,e=>{if(e.stopPropagation(),a||!n||!n.name)return;a=!0,i.disabled=!0;let t={};for(let e of n.context||[])!e||typeof e.key!=`string`||(t[e.key]=X(e.value,r));i.dispatchEvent(new CustomEvent(`a2ui-action`,{bubbles:!0,composed:!0,detail:{name:n.name,context:t}}))});break}case`CheckBox`:{i=document.createElement(`label`),i.className=`a2ui-std-checkbox`;let e=document.createElement(`input`);e.type=`checkbox`;let n=!!X(t.value,r);e.checked=n,Y(r,t.value,n);let a=document.createElement(`span`);a.className=`a2ui-std-checkbox-label`,a.textContent=X(t.label,r)||``,i.appendChild(e),i.appendChild(a),e.addEventListener(`change`,()=>{J(t.value)&&Z(r.dataModel,t.value.path,e.checked)});break}case`TextField`:{i=document.createElement(`div`),i.className=`a2ui-std-textfield`;let e=X(t.label,r);if(e){let t=document.createElement(`div`);t.className=`a2ui-std-textfield-label`,t.textContent=e,i.appendChild(t)}let n=t.textFieldType||`shortText`,a=n===`longText`?document.createElement(`textarea`):document.createElement(`input`);a.tagName===`INPUT`?a.type={date:`date`,number:`number`,obscured:`password`}[n]||`text`:a.rows=2,a.className=`a2ui-std-textfield-input`;let o=X(t.text,r);a.value=o==null?``:String(o),Y(r,t.text,a.value),t.validationRegexp&&a.tagName===`INPUT`&&(a.pattern=t.validationRegexp),a.placeholder=e||``,a.addEventListener(`input`,()=>{J(t.text)&&Z(r.dataModel,t.text.path,a.value)}),i.appendChild(a);break}case`MultipleChoice`:{i=document.createElement(`div`);let e=t.variant||`checkbox`;i.className=`a2ui-std-mc a2ui-std-mc-${e}`;let n=t.maxAllowedSelections,a=X(t.selections,r),o=Array.isArray(a)?[...a]:[];Y(r,t.selections,o);let s=t.options||[],c=()=>{for(let e of i.children){let t=e.dataset.value;e.setAttribute(`aria-pressed`,o.includes(t)?`true`:`false`)}};for(let e of s){let a=document.createElement(`button`);a.type=`button`,a.className=`a2ui-std-mc-option`,a.dataset.value=e.value,a.textContent=X(e.label,r)||e.value,a.setAttribute(`aria-pressed`,o.includes(e.value)?`true`:`false`),a.addEventListener(`click`,()=>{let i=e.value;if(o.includes(i))o=o.filter(e=>e!==i);else if(n===1)o=[i];else if(typeof n==`number`&&o.length>=n)return;else o.push(i);J(t.selections)&&Z(r.dataModel,t.selections.path,o),c()}),i.appendChild(a)}break}default:return G(`instantiateStandard: unknown type ${e}`),null}return i._a2uiType=e,i._a2uiSurfaceId=r.surfaceId,i._a2uiSourceComponentId=n,i}var We={check:`✓`,close:`✕`,arrowBack:`←`,arrowForward:`→`,home:`⌂`,search:`⌕`,info:`ⓘ`,warning:`⚠`,error:`⚠`,shoppingCart:`🛒`,payment:`💳`,lock:`🔒`,lockOpen:`🔓`,star:`★`,starOff:`☆`,favorite:`♥`,favoriteOff:`♡`},Ge=!1;function Ke(){if(Ge)return;Ge=!0;let e=document.createElement(`style`);e.id=`a2ui-std-styles`,e.textContent=`
    /* Top-level non-Card root gets the same outer chrome as the old custom
       components so chips/forms/etc. don't render as bare flex boxes. */
    .a2ui-std-root:not(.a2ui-std-card) { margin: 0 12px; padding: 14px 16px; background: #fff; border: 1px solid #ece8e0; border-radius: var(--a2ui-radius-md, 14px); box-shadow: 0 1px 2px rgba(20, 18, 14, 0.04), 0 6px 16px -10px rgba(20, 18, 14, 0.08); font-family: var(--a2ui-font-sans, system-ui, sans-serif); }
    .a2ui-std-root.a2ui-std-col { gap: 12px; }
    .a2ui-std-text { font-family: var(--a2ui-font-sans, system-ui, sans-serif); color: #1B1B1F; line-height: 1.45; }
    .a2ui-std-text-h1 { font-size: 22px; font-weight: 700; margin: 0 0 8px; }
    .a2ui-std-text-h2 { font-size: 18px; font-weight: 700; margin: 0 0 6px; }
    .a2ui-std-text-h3 { font-size: 16px; font-weight: 600; margin: 0 0 6px; }
    .a2ui-std-text-h4 { font-size: 14px; font-weight: 600; margin: 0 0 6px; }
    .a2ui-std-text-h5 { font-size: 13px; font-weight: 600; margin: 0 0 4px; letter-spacing: .2px; }
    .a2ui-std-text-caption { font-size: 12px; color: #6b6973; }
    .a2ui-std-text-body { font-size: 14px; }
    .a2ui-std-row { display: flex; flex-direction: row; gap: 8px; flex-wrap: wrap; }
    .a2ui-std-col { display: flex; flex-direction: column; gap: 8px; }
    .a2ui-std-card { margin: 0 12px; padding: 14px 16px; border: 1px solid #ece8e0; border-radius: var(--a2ui-radius-md, 14px); background: #fff; box-shadow: 0 1px 2px rgba(20, 18, 14, 0.04), 0 6px 16px -10px rgba(20, 18, 14, 0.08); font-family: var(--a2ui-font-sans, system-ui, sans-serif); }
    .a2ui-std-divider.horizontal { border: 0; border-top: 1px solid #ece8e0; margin: 6px 0; }
    .a2ui-std-divider.vertical { border: 0; border-left: 1px solid #ece8e0; align-self: stretch; }
    .a2ui-std-image { max-width: 100%; border-radius: 10px; }
    .a2ui-std-image-icon { width: 16px; height: 16px; border-radius: 0; }
    .a2ui-std-image-avatar { width: 36px; height: 36px; border-radius: 50%; }
    .a2ui-std-image-smallFeature { max-height: 96px; }
    .a2ui-std-image-mediumFeature { max-height: 200px; }
    .a2ui-std-image-largeFeature { max-height: 320px; }
    .a2ui-std-image-header { width: 100%; max-height: 220px; object-fit: cover; }
    .a2ui-std-icon { display: inline-block; min-width: 1em; text-align: center; }
    .a2ui-std-btn { font: inherit; font-size: 14px; font-weight: 600; padding: 9px 16px; border-radius: 999px; border: 1px solid #e5e1d8; background: #faf7f1; color: #1B1B1F; cursor: pointer; transition: background .15s, border-color .15s, transform .08s; }
    .a2ui-std-btn:active { transform: scale(0.97); }
    .a2ui-std-btn[aria-pressed="true"] { background: var(--a2ui-color-accent, #5b6cff); color: #fff; border-color: var(--a2ui-color-accent, #5b6cff); }
    .a2ui-std-btn.primary { background: var(--a2ui-color-accent, #5b6cff); color: #fff; border-color: var(--a2ui-color-accent, #5b6cff); box-shadow: 0 4px 12px -4px rgba(91, 108, 255, 0.45); }
    .a2ui-std-checkbox { display: flex; align-items: center; gap: 10px; padding: 4px 0; font-family: var(--a2ui-font-sans, system-ui, sans-serif); font-size: 14px; color: #1B1B1F; }
    .a2ui-std-checkbox input[type=checkbox] { width: 18px; height: 18px; accent-color: var(--a2ui-color-accent, #5b6cff); }
    .a2ui-std-textfield { display: flex; flex-direction: column; gap: 6px; font-family: var(--a2ui-font-sans, system-ui, sans-serif); }
    .a2ui-std-textfield-label { font-size: 11px; color: #8a8790; text-transform: uppercase; letter-spacing: .8px; font-weight: 600; }
    .a2ui-std-textfield-input { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #e5e1d8; border-radius: 10px; font: inherit; font-size: 14px; color: #1B1B1F; background: #faf7f1; }
    .a2ui-std-textfield-input:focus { outline: none; border-color: var(--a2ui-color-accent, #5b6cff); background: #fff; }
    .a2ui-std-mc { display: flex; flex-wrap: wrap; gap: 6px; }
    .a2ui-std-mc-chips .a2ui-std-mc-option { font: inherit; font-size: 13px; padding: 7px 14px; border-radius: 999px; border: 1px solid #e5e1d8; background: #faf7f1; color: #2a2a30; cursor: pointer; transition: background .15s, border-color .15s, transform .08s; }
    .a2ui-std-mc-chips .a2ui-std-mc-option:active { transform: scale(0.97); }
    .a2ui-std-mc-chips .a2ui-std-mc-option[aria-pressed="true"] { background: var(--a2ui-color-accent, #5b6cff); color: #fff; border-color: var(--a2ui-color-accent, #5b6cff); }
    .a2ui-std-mc-checkbox { flex-direction: column; align-items: stretch; }
    .a2ui-std-mc-checkbox .a2ui-std-mc-option { font: inherit; font-size: 14px; padding: 10px 12px; border-radius: 10px; border: 1px solid #e5e1d8; background: #faf7f1; color: #1B1B1F; cursor: pointer; text-align: left; }
    .a2ui-std-mc-checkbox .a2ui-std-mc-option[aria-pressed="true"] { background: #fff; border-color: var(--a2ui-color-accent, #5b6cff); box-shadow: 0 0 0 1px var(--a2ui-color-accent, #5b6cff) inset; }
  `,document.head.appendChild(e)}async function qe(e){if(e&&e.updateComplete)try{await e.updateComplete}catch{}$(),e?.addEventListener(`load`,$,!0),e?.addEventListener(`error`,$,!0);let t=0,n=setInterval(()=>{$(),++t>10&&clearInterval(n)},80)}function X(e,t){if(e==null)return e;if(Array.isArray(e))return e.map(e=>X(e,t));if(typeof e!=`object`)return e;if(Ye(e))return Xe(e,t);let n={};for(let[r,i]of Object.entries(e))n[r]=X(i,t);return n}var Je=new Set([`literalString`,`literalNumber`,`literalBoolean`,`literalArray`,`path`]);function Ye(e){let t=Object.keys(e);return t.length===0||t.length>1?!1:Je.has(t[0])}function Xe(e,t){if(`literalString`in e)return e.literalString;if(`literalNumber`in e)return e.literalNumber;if(`literalBoolean`in e)return e.literalBoolean;if(`literalArray`in e)return e.literalArray;if(`path`in e)return Ze(t.dataModel,e.path)}function Ze(e,t){if(!t||t===`/`)return e;let n=t.replace(/^\/+/,``).split(`/`),r=e;for(let e of n){if(r==null)return;r=r[e]}return r}function Z(e,t,n){let r=t.replace(/^\/+/,``).split(`/`).filter(Boolean);if(r.length===0)return;let i=e;for(let e=0;e<r.length-1;e++)(i[r[e]]==null||typeof i[r[e]]!=`object`)&&(i[r[e]]={}),i=i[r[e]];i[r[r.length-1]]=n}function Qe(e){for(let[t,n]of Object.entries(e||{}))t===`primaryColor`?document.documentElement.style.setProperty(`--a2ui-color-accent`,n):t===`font`?document.documentElement.style.setProperty(`--a2ui-font-sans`,n):document.documentElement.style.setProperty(`--a2ui-${t}`,n)}function $e(e){for(let[t,n]of Object.entries(e||{}))document.documentElement.style.setProperty(`--a2ui-${t}`,n)}function et(e,t){let n=e?.name;if(!n)return;let r={userAction:{name:n,surfaceId:t?._a2uiSurfaceId??null,sourceComponentId:t?._a2uiSourceComponentId??null,timestamp:new Date().toISOString(),context:e.context||{}}},i=JSON.stringify(r);window.AndroidBridge?.onAction&&window.AndroidBridge.onAction(i),window.parent?.postMessage({type:`a2ui:userAction`,message:r},`*`)}document.addEventListener(`a2ui-action`,e=>{et(e.detail||{},e.target)});var Q=-1;function $(){let e=W();if(!e)return;let t=e.scrollHeight,n=e.offsetHeight,r=Math.max(t,n)+12,i=Math.max(60,r),a=window.devicePixelRatio||1,o=Math.ceil(i*a);o!==Q&&(Q=o,window.AndroidBridge?.onResize&&window.AndroidBridge.onResize(o),window.parent?.postMessage({type:`a2ui:resize`,height:o},`*`))}var tt=()=>{let e=W();e&&new ResizeObserver($).observe(e)};document.readyState===`loading`?document.addEventListener(`DOMContentLoaded`,tt,{once:!0}):tt();function nt(){U.clear();let e=W();e&&(e.innerHTML=``,delete e.dataset.surfaceId)}return window.a2ui={ingest:Ae,applyTheme:$e,reset:nt,CATALOG_ID:De,STANDARD_CATALOG_ID:Oe},e.CATALOG_ID=De,e.STANDARD_CATALOG_ID=Oe,e})({});