// ==UserScript==
// @name		Galkontinuum
// @namespace	6930e44863619d3f19806f68f74dbf62
// @author		Bipface
// @version		2019.04.18
// @description	Enhanced browsing on Booru galleries
// @homepageURL https://github.com/bipface/galkontinuum/tree/master/#readme
// @downloadURL https://github.com/bipface/galkontinuum/raw/master/dist/galkontinuum.user.js
// @run-at		document-end
// @grant		none
// @match		*://danbooru.donmai.us/*
// @match		*://e621.net/*
// @match		*://gelbooru.com/*
// @match		*://realbooru.com/*
// @match		*://rule34.xxx/*
// @match		*://safebooru.org/*
// @match		*://testbooru.donmai.us/*
// @match		*://yande.re/*
// ==/UserScript==

'use strict';

const readmeMarkdown =
`# Galkontinuum
Galkontinuum is a [userscript][1] which enables slideshow-style browsing of
search results on the Booru family of sites.

It targets galleries running Gelbooru 0.2.x, Danbooru 2.x, Danbooru 1.x and
compatible forks such as e621 and Moebooru.

[1]: https://en.wikipedia.org/wiki/Userscript

## Installation

### Requirements

- Firefox 56 or newer.
- Chrome 60 or newer.

### Chrome - standalone extension (Windows)

Be aware that the script will not update automatically when installed this way.

1. Download the files \`dist/galkontinuum.user.js\` and \`dist/manifest.json\`
into a new directory.

2. Go to \`chrome://extensions\`.

3. Enable the **Developer mode** option and choose **Load unpacked**.
![Load unpacked](https://i.imgur.com/RDu11ts.png)

4. Select the directory containing the downloaded files.
![Select Folder](https://i.imgur.com/mvJnMHQ.png)

## Limitations

- On Gelbooru-based sites, posts added within the last few minutes may fail to
load due to the search database being out of sync with the main database.

- Posts with an ID less than zero or greater than 2147483647 will not be
recognised. It is unknown whether there are any boorus with IDs outside this
range.

- On Danbooru-based sites, it is suspected that only up to 1000 notes will be
shown on any single post. It is unknown whether there are any posts with over
1000 notes.
`;

const dbg = false;

const manifest = {
	"manifest_version": 2,
	"name": "Galkontinuum",
	"version": "2019.04.18",
	"author": "Bipface",
	"key": "u+fV2D5ukOQp8yXOpGU2itSBKYT22tnFu5Nbn5u12nI=",
	"homepage_url": "https://github.com/bipface/galkontinuum/tree/master/#readme",
	"minimum_chrome_version": "60",
	"converted_from_user_script": true,
	"content_scripts": [
		{
			"js": [
				"galkontinuum.user.js"
			],
			"run_at": "document_end",
			"matches": [
				"*://danbooru.donmai.us/*",
				"*://e621.net/*",
				"*://gelbooru.com/*",
				"*://realbooru.com/*",
				"*://rule34.xxx/*",
				"*://safebooru.org/*",
				"*://testbooru.donmai.us/*",
				"*://yande.re/*"
			],
			"exclude_matches": [],
			"include_globs": [
				"*"
			],
			"exclude_globs": []
		}
	]
};
/* note: in chrome, standalone userscripts don't have access to `GM_info` */

const globalObj =
	typeof self !== `undefined` ? self :
	typeof global !== `undefined` ? global :
	Function(`return this`)();
/* don't use `globalThis` - not assigned correctly in some environments */

if (typeof globalObj !== `object`) {
	throw new Error(`failed to obtain global object`);};

const runtime =
	(typeof globalObj.document === `object`
		&& globalObj.document.defaultView === globalObj)
		? `browser`
	: (typeof globalObj.process === `object`
		&& typeof globalObj.process.release === `object`
		&& globalObj.process.release.name === `node`)
		? `nodejs`
	: undefined;

/* workaround for prototype.js (which redefines `window.Element`): */
const Element =
	runtime === `browser`
		? ((document.documentElement instanceof globalObj.Element)
			? globalObj.Element
			: Object.getPrototypeOf(HTMLElement.prototype).constructor)
		: undefined;
if (runtime === `browser` && !(document.documentElement instanceof Element)) {
	throw new Error(`tampered Element class`);};

/*

known issues:

	- yande.re: gallary results are in an unknown order
	- moebooru is_held flag (see below)
	- 6-term search limit on e621/moebooru
		https://e621.net/post/index?tags=a+b+c+d+e+f+g
	- swf videos not supported yet
	- on e621 it seems only one id:* search term can be specified
		test: https://e621.net/post/index.json?tags=id:500%20id:%3E1000%20order:id&limit=1
	- probably won't work with danbooru's zip-player videos
		test: https://danbooru.donmai.us/posts/3471696
	- controls typically end up off-screen; hinders navigation by clicking
		(mainly affects mobile browsing)
	- can't navigate when search query includes sort:* / order:*
	- media type badge is misaligned on e621 thumbnails
	- scrollIntoView() can get erratic when navigating
	- animated gif / video loses playback position when scale-mode changes
	- player appears with wrong dimensions before video starts loading
	- navigating on danbooru does't skip posts that aren't visible to the
		current user or that have status:deleted
		test: https://danbooru.donmai.us/posts?tags=id%3A3478499+status%3Adeleted
	- thumbnail appears even when full-size image loads from cache
		(causes background 'flashing' when navigating
		through images with transparent backgrounds)
	- thumbnail may remain visible after the first frame of an animation is
		fully rendered (noticible with alpha-transparent gifs)
	- gelbooru: thumbnail overlay is exactly the size of the thumbnail itself:
		https://i.imgur.com/YJjIzxt.png
	- tryParsePostId() imposes a much stricter syntax than the sites
		themselves seem to,
		for example,
		the following addresses resolve to post 158:
		https://rule34.xxx/?page=post&s=view&id=%2b158
		https://rule34.xxx/?page=post&s=view&id=0158
		https://rule34.xxx/?page=post&s=view&id=%23158
		https://rule34.xxx/?page=post&s=view&id=%09158
		the following address resolves to post 159:
		https://rule34.xxx/?page=post&s=view&id=%20++%23+00158.99999999999999++
		danbooru is similarly lenient

proposed enhancements:

	- spinner on the thumbnail overlay
	- more things in the footer bar
	- click the image for next/prev/scale
	- stateAsFragment() should optimise away redundant fields
	- post pages: add a link back to the gallery page on which it appears
	- settings for showing fullsize/thumbnail/sample
		loading full-size images may not always be desirable
		(e.g. mobile browsing with small data allowance)
	- more diagnostic logging

test cases:

	environments:
		- firefox 56, greasemonkey 3
		- firefox 56, greasemonkey 4
		- firefox current, greasemonkey 4
		- firefox current, tampermonkey
		- firefox android, ?
		- chrome current, content-script (manifest.json)
		- chrome current, tampermonkey

	media:
		- jpeg / png (static) / gif (static)
		- png (animated) / gif (animated)
		- webm / mp4 (?)
			- controls visible, loop enabled, volume?
		- swf
		- zip-player
		- sample may or may not exist
		- tall:
			https://e621.net/post/index/1/id:1363663
		- wide:
			https://e621.net/post/index/1/id:1848964
			https://rule34.xxx/?page=post&s=list&tags=id%3a2386407
		- nonexistent:
			https://rule34.xxx/?page=post&s=list#galkontinuum:{"currentPostId":59391120}
		- inaccessible:
			https://danbooru.donmai.us/posts#galkontinuum:{"currentPostId":3453471}

	sites:
		- rule34 (special-case for thumbnail urls,
			special-case for getInlineViewParent)
		- gelbooru (special-case for getInlineViewParent)
		- yandere (special-case for thumbnail layout)
		- e621 (special-case for thumbnail layout)

	navigation:
		- navigating before/after current search results list (across pages)
		- attempting to navigate before first item or after last item
		- id: / sort: / order: search terms
		- 2 or more search terms (danbooru limitation)
		- 6 or more search terms (e621 limitation)
		- attempting to navigate with posts which aren't in solr database yet
			(on gelbooru-type sites)
		- navigate around, wait 1 minute for caches to expire, then
			navigate some more

	notes overlay:
		- desktop
		- mobile
		test:
			https://danbooru.donmai.us/posts?tags=id:3339117
			https://e621.net/post/index/?tags=id:1843616
			https://rule34.xxx/?page=post&s=list&tags=id:2269258

	danbooru post statuses:
		- visible: active, unmoderator, flagged, modqueue, pending
		- hidden: banned (dmca)
			https://danbooru.donmai.us/posts?tags=id:3482400
		- hidden: deleted
			https://danbooru.donmai.us/posts?tags=id:3464546
		- hidden: restricted (not an actual status)
			https://danbooru.donmai.us/posts?tags=id:3453471

		note: on danbooru, status:deleted and -status:deleted are exempt from
			the search term limit

		by default, searches seem to assume an implicit -status:deleted

	moebooru:
		has an `is_held` flag where the post doesn't appear in gallery searches
		but is returned by api searches
		(apparently can use search term `holds:false`)
		https://yande.re/forum/show/26190
		https://yande.re/wiki/show?title=howto%3Ahold
		https://github.com/moebooru/moebooru/blob/master/app/models/post/sql_methods.rb
		note: `index_timestamp` does not exist in danbooru codebase

	...

intrinsics in chrome standalone userscript:

	- GM_log → console.log(…)
	- GM_openInTab → open(href, ``)
	- GM_addStyle → head.appendChild(<style>)
	- GM_xmlhttpRequest → ordinary XMLHttpRequest, without bypassing CORS

	not supported:
	- GM_registerMenuCommand
	- GM_getValue
	- GM_setValue

references:

	danbooru search term limit:
		/danbooru/blob/master/config/danbooru_default_config.rb
			→ is_unlimited_tag?(tag)

	danbooru restricted tags:
		https://danbooru.donmai.us/wiki_pages/84990

	easylist generic element hiding rules on gelbooru/r34xxx:
		https://github.com/easylist/easylist/blob/a19a5324bfb8be835c6361162c51c87b07603bfe/easylist/easylist_specific_hide.txt#L10241

*/

/* -------------------------------------------------------------------------- */

const unittests = dbg ? [] : null;
const test =
	dbg
		? f => {unittests.push(f);}
		: () => {};

const nodejsEntrypoint = async function(command, argJson) {
	let arg = tryParseJson(argJson);
	enforce(typeof arg === `object`,
		`invalid parameter "${argJson}" - expected json object`);

	let fs = require(`fs`);
	let readline = require(`readline`);
	let path = require(`path`);

	enforce(typeof process.mainModule === `object`);
	let selfFilePath = process.mainModule.filename;

	switch (command) {
		case undefined :
		case `run-unittests` : {
			if (dbg) {
				runUnittests(unittests);
			} else {
				logWarn(`no tests defined (debug mode disabled)`);};
			return;
		};

		case `create-readme` : {
			process.stdout.write(readmeMarkdown);
			return;
		};

		case `create-release` : {
			/* reads the current source file and applies
			alterations for release-mode:
				- populate @description and @downloadURL
				- populate `manifest` object
				- assign `dbg = false`

			parameters: see `create-manifest`

			result is written to stdout */

			let lines = readline.createInterface({
				input : fs.createReadStream(selfFilePath),
				crlfDelay : Infinity,});

			let manif = await createManifest(lines, {
				filename : path.basename(selfFilePath),
				...arg});

			lines = readline.createInterface({
				input : fs.createReadStream(selfFilePath),
				crlfDelay : Infinity,});

			/* note: `for await (…)` isn't supported in firefox 56 */

			let outputXs = createReleaseSegments(lines, manif, arg);
			for (let value, iter = outputXs[Symbol.asyncIterator]();
				!({value} = await iter.next()).done;)
			{
				process.stdout.write(value+`\n`);
			};

			return;
		};

		case `create-manifest` : {
			/* generate a json manifest from ==UserScript== block

			parameters:
				- "filename" : filename for `js : […]` section
				- "homepageHref" : address for `@homepageURL` field
				- "downloadHref" : address for `@downloadURL` field

			result is written to stdout */

			let lines = readline.createInterface({
				input : fs.createReadStream(selfFilePath),
				crlfDelay : Infinity,});

			let manif = await createManifest(lines, {
				filename : path.basename(selfFilePath),
				...arg});

			process.stdout.write(
				JSON.stringify(manif, null, `\t`));

			return;
		};

		default :
			throw new Error(`unrecognised command "${command}"`);
	};
};

const runUnittests = function(xs) {
	assert(Array.isArray(xs));

	let totalCount = xs.length;
	let failCount = totalCount;
	for (let f of xs) {
		try {
			f();
			--failCount;
		} catch (err) {
			logError(`unittest failure:`, err.message, `-`, err.stack);};
	};
	logInfo(`${totalCount - failCount}/${totalCount} unittests passed`);

	if (failCount !== 0) {
		throw new Error(`${failCount} unittest(s) failed`);};
};

const createReleaseSegments = function(
	srcLines, manif, {downloadHref, homepageHref})
{
	dbg && assert(typeof srcLines[Symbol.asyncIterator] === `function`);
	dbg && assert(typeof manif === `object`);

	let homepageUrl = null;
	if (typeof homepageHref === `string`) {
		homepageUrl = tryParseHref(homepageHref);};
	enforce(homepageUrl !== null || homepageHref === undefined,
		`invalid url "${homepageHref}"`);

	let downloadUrl = null;
	if (typeof downloadHref === `string`) {
		downloadUrl = tryParseHref(downloadHref);};
	enforce(downloadUrl !== null || downloadHref === undefined,
		`invalid url "${downloadHref}"`);

	let next = async function() {
		let {value, done} = await this.linesIter.next();

		if (done) {
			;
		} else if (downloadUrl !== null
			&& /^\s*\/\/\s*@downloadURL(\s.*)?$/.test(value))
		{
			value = `// @downloadURL ${downloadUrl.href}`;

		} else if (homepageUrl !== null
			&& /^\s*\/\/\s*@homepageURL(\s.*)?$/.test(value))
		{
			value = `// @homepageURL ${homepageUrl.href}`;

		} else if (/^const\s+dbg\s*=[^;]*;.*$/.test(value)) {
			value = `const dbg = false;`;

		} else if (/^const\s+manifest\s*=[^;]*;.*$/.test(value)) {
			value = `const manifest = ${JSON.stringify(manif, null, '\t')};`;
		};

		return {value, done};
	};

	return {
		[Symbol.asyncIterator]() {
			return {
				next,
				manif,
				linesIter : srcLines[Symbol.asyncIterator](),};
		},
	};
};

const createManifest = async function(srcLines, {filename, homepageHref}) {
	/* https://developer.chrome.com/extensions/manifest */

	dbg && assert(typeof srcLines[Symbol.asyncIterator] === `function`);
	enforce(typeof filename === `string`,
		`invalid filename "${filename}" - expected string`);

	let homepageUrl = null;
	if (typeof homepageHref === `string`) {
		homepageUrl = tryParseHref(homepageHref);};
	enforce(homepageUrl !== null || homepageHref === undefined,
		`invalid url "${homepageHref}"`);

	let name = filename;
	let version = `0000.00.00`;
	let runAt = undefined;
	let matches = [];
	let foundHeader = false;

	let userscriptHeader = `==UserScript==`;
	let userscriptFooter = `==/UserScript==`;

	/* note: `for await (…)` isn't supported in firefox 56 */

	for (let value, iter = srcLines[Symbol.asyncIterator]();
		!({value} = await iter.next()).done;)
	{
		let {1 : k, 2 : v} = {.../^\s*\/\/\s*(\S+)(.*)$/.exec(value)};
		v = typeof v === `string` ? v.trim() : ``;
		if (typeof k !== `string`
			|| k === ``
			|| k === userscriptFooter)
		{
			break;};

		if (!foundHeader) {
			enforce(k === userscriptHeader,
				`expected userscript header "// ${userscriptHeader}"`);
			foundHeader = true;
		};

		if (k === `@name`) {
			name = v;
		} else if (k === `@version`) {
			version = v;
		} else if (k === `@match`) {
			matches.push(v);
		} else if (k === `@run-at`) {
			runAt = v.replace('-', '_');};
	};

	/* note: `download_url` is a non-standard field;
		corresponds to the `@downloadURL` field in the metadata block */

	return {
		manifest_version : 2,
		name,
		version, /* note: must consist of digits and dots */
		author : `Bipface`,
		key : `u+fV2D5ukOQp8yXOpGU2itSBKYT22tnFu5Nbn5u12nI=`,
		homepage_url : (homepageUrl ? homepageUrl.href : undefined),
		minimum_chrome_version : `60`, /* suspected */
		converted_from_user_script : true,
		content_scripts : [
			{
				js : [filename],
				run_at : runAt,
				matches,
				exclude_matches : [],
				include_globs : [`*`],
				exclude_globs : [],}]};
};

const userscriptEntrypoint = function(doc) {
	dbg && runUnittests(unittests);

	let url = tryParseHref(doc.location.href);
	if (!(doc instanceof HTMLDocument) || !isGalleryUrl(url))
	{
		logInfo(`document does not appear to be a gallery; aborting`);
		return;
	} else {
		let d = getDomain({origin : url.origin});
		logInfo(`document appears to be a gallery`,
			`(domain: ${d.name}, kind: ${d.kind}, subkind: ${d.subkind})`);
	};

	enforce([`interactive`, `complete`].includes(doc.readyState),
		`document not loaded`);

	doc.defaultView.addEventListener(
		`keydown`,
		onKeyDownGlobal,
		true);

	doc.defaultView.addEventListener(
		`hashchange`,
		ev => {applyToDocument(doc);},
		false);

	applyToDocument(doc);
};

/* -------------------------------------------------------------------------- */

const namespace = `galkontinuum`;
const galk = new Proxy({}, {get : (_, name) => `${namespace}-${name}`})

const hostnameDomainTbl = {
	[`danbooru.donmai.us`] : {
		kind : `danbooru`, subkind : `danbooru`, name : `danbooru`},
	[`gelbooru.com`] : {
		kind : `gelbooru`, name : `gelbooru`},
	[`e621.net`] : {
		kind : `danbooru`, subkind : `e621`, name : `e621`},
	[`realbooru.com`] : {
		kind : `gelbooru`, name : `realbooru`},
	[`rule34.xxx`] : {
		kind : `gelbooru`, name : `r34xxx`},
	[`safebooru.org`] : {
		kind : `gelbooru`, name : `safebooru`},
	[`testbooru.donmai.us`] : {
		kind : `danbooru`, subkind : `danbooru`, name : `danbooru`},
	[`yande.re`] : {
		kind : `danbooru`, subkind : `moebooru`, name : `yandere`},
};

const onKeyDownGlobal = function(ev) {
	/* global hotkeys: */

	let doc = ev.target.ownerDocument;

	if (ev.key === `ArrowRight` || ev.key === `Right`) {
		let btn = getSingleElemByClass(doc, galk.prev);
		if (btn instanceof HTMLElement) {
			btn.click();
			ev.stopPropagation();};

	} else if (ev.key === `ArrowLeft` || ev.key === `Left`) {
		let btn = getSingleElemByClass(doc, galk.next);
		if (btn instanceof HTMLElement) {
			btn.click();
			ev.stopPropagation();};
	};
};

const applyToDocument = function(doc) {
	dbg && assert(doc instanceof HTMLDocument);

	let url = tryParseHref(doc.location.href);
	if (!isGalleryUrl(url)) {
		logInfo(`document does not appear to be a gallery; aborting`);
		return;};

	let state = stateFromUrl(url);
	if (state === null) {
		logError(`failed to derive state from url "${url.href}"; aborting`);
		return;};

	ensureApplyGlobalStyleRules(state, doc,
		() => getGlobalStyleRules(getDomain(state)));

	let viewParent = getInlineViewParent(state, doc);
	let view = getInlineView(state, viewParent);

	if (!isPostId(state.currentPostId)) {
		if (view !== null) {
			view.remove();};
	} else {
		if (view === null) {
			view = ensureInlineView(state, doc, viewParent);};

		if (view !== null) {
			bindInlineView(state, doc, view);
		} else {
			logError(`failed to create inline-view panel`);};
	};

	let thumbsElem = getThumbnailsListElem(state, doc);
	if (thumbsElem !== null) {
		bindThumbnailsList(state, doc, thumbsElem);
	} else {
		logError(`failed to find thumbnail list element`);};

	if (getDomain(state).name === `danbooru`) {
		ensureForwardDanbooruTooltipEvents(state, doc);};
};

const bindInlineView = async function(state, doc, view) {
	dbg && assert(isPostId(state.currentPostId));

	let infoPromise = tryGetPostInfo(state, state.currentPostId)
	let notesPromise = tryGetPostNotes(state, state.currentPostId);

	while (view.hasChildNodes()) {
		view.removeChild(view.lastChild);};

	let scaleBtnMode = state.scaleMode === `fit` ? `full` : `fit`;

	let baseHref = doc.location.href;

	let scaleHref = stateAsFragment(
		{...state, scaleMode : scaleBtnMode}, baseHref);

	let exHref = postPageUrl(state, state.currentPostId).href;

	let closeHref = stateAsFragment(
		{...state, currentPostId : undefined}, baseHref);

	view.insertAdjacentHTML(`beforeend`,
		`<header class='${galk['iv-header']} ${galk['iv-ctrls']}'>
			<a title='Toggle Size'
				class='${galk.scale} ${galk[scaleBtnMode]}'
				href='${xmlEscape(scaleHref)}'>
				<figure class='${galk['btn-icon']}'></figure></a>

			<a title='Next' class='${galk.next}' href='#'>
				<figure class='${galk['btn-icon']}'></figure></a>

			<a title='#${state.currentPostId}' class='${galk.ex}'
				href='${xmlEscape(exHref)}'>
				<figure class='${galk['btn-icon']}'></figure></a>

			<a title='Previous' class='${galk.prev}' href='#'>
				<figure class='${galk['btn-icon']}'></figure></a>

			<a title='Close' class='${galk.close}'
				href='${xmlEscape(closeHref)}'>
				<figure class='${galk['btn-icon']}'></figure></a>
		</header>

		<section class='${galk['iv-content-panel']}'>
			<section class='${galk['iv-content-stack']}'>
				<aside class='${galk['note-overlay']}'></aside>

				<img class='${galk.media}' hidden=''/>

				<video class='${galk.media}' hidden=''
					controls='' loop=''></video>

				<img class='${galk['media-sample']}' hidden=''/>

				<img class='${galk['media-thumbnail']}' hidden=''/>

				<img class='${galk['media-placeholder']}'/>

				<figure class='${galk['media-unavailable']}' hidden=''></figure>
			</section>
		</section>

		<footer class='${galk['iv-footer']} ${galk['iv-ctrls']}'>
			<a title='Toggle Notes' href=''
				class='${galk.notes} ${galk.disabled}'>
				<figure class='${galk['btn-icon']}'></figure></a>
			<a class='${galk.disabled}'></a>
			<a class='${galk.disabled}'></a>
			<a class='${galk.disabled}'></a>
			<a title='Help' class='${galk.disabled}'></a>
		</footer>`);

	/* note: avoid using <div> due to global !important styles in safebooru's
	mobile layout stylesheet */

	let stackElem = enforce(getSingleElemByClass(
		view, galk[`iv-content-stack`]));

	let imgElem = enforce(view.querySelector(`img.${galk.media}`));

	let vidElem = enforce(view.querySelector(`video.${galk.media}`));

	let sampleElem = enforce(getSingleElemByClass(
		view, galk['media-sample']));

	let thumbnailElem = enforce(getSingleElemByClass(
		view, galk['media-thumbnail']));

	let phldrElem = enforce(getSingleElemByClass(
		view, galk['media-placeholder']));

	stackElem.classList.toggle(
		galk['scale-fit'], state.scaleMode === `fit`);

	let info = await infoPromise;
	if (info !== null) {

		{/* scroll to the placeholder when it loads: */
			let triggered = false;
			let f = ev => {
				phldrElem.removeEventListener(ev.type, f);
				if (!triggered) {
					log(`media-placeholder ${ev.type} event triggered`);
					maybeScrollIntoView(
						doc.defaultView, phldrElem, `instant`);};
				triggered = true;
			};
			phldrElem.addEventListener(`load`, f);
			phldrElem.addEventListener(`loadedmetadata`, f);
		};

		/* use `srcset` as a workaround for easylist element hiding rules: */
		phldrElem.srcset = svgDataHref(
			svgEmptyPlaceholder(info.width, info.height));

		if (info.thumbnailHref) {
			thumbnailElem.src = info.thumbnailHref;
			thumbnailElem.hidden = false;};

		if (info.type === `video`) {
			vidElem.src = info.imageHref;
			vidElem.hidden = false;

			//imgElem.addEventListener(`load`, ev => {

		} else {
			if (info.sampleHref) {
				// disabled for now as it interferes with the alpha-channel

				//sampleElem.src = info.sampleHref;
				//sampleElem.hidden = false;
			};

			/* hide the resampled versions when the full image loads: */
			imgElem.addEventListener(`load`, ev => {
				log(`media (image) ${ev.type} event triggered`);
				thumbnailElem.classList.add(galk['animate-to-hidden']);
				//thumbnailElem.hidden = true;
				//thumbnailElem.src = ``;

				//sampleElem.hidden = true;
				//sampleElem.src = ``;
			});

			if (info.imageHref) {
				imgElem.src = info.imageHref;
				imgElem.hidden = false;};
		};

		let notes = await notesPromise;
		if (notes !== null && notes.length !== 0) {
			let notesOvr = enforce(getSingleElemByClass(
				view, galk['note-overlay']));
			bindNotesOverlay(state, notesOvr, info, notes);

			view.classList.add(galk['notes-visible']);

			let notesBtn = enforce(getSingleElemByClass(view, galk.notes));
			notesBtn.addEventListener(`click`, ev => {
				view.classList.toggle(galk['notes-visible']);
				ev.preventDefault();
				ev.stopPropagation();
			}, false);
			notesBtn.classList.remove(galk.disabled);
		};

	} else {
		logWarn(
			`failed to acquire metadata for current post`+
			` (id:${state.currentPostId})`);

		let unavElem = enforce(getSingleElemByClass(
			view, galk['media-unavailable']));

		unavElem.style.backgroundImage = `url("${svgDataHref(
			svgMediaUnavailable(state.currentPostId))}")`;
		unavElem.hidden = false;

		maybeScrollIntoView(doc.defaultView, unavElem, `instant`);
	};

	let prevBtn = enforce(getSingleElemByClass(view, galk.prev));
	let nextBtn = enforce(getSingleElemByClass(view, galk.next));

	if (searchExprContainsOrderTerm(state, state.searchExpr)) {
		/* navigation cannot work when using non-default sort order */
		prevBtn.classList.add(galk.disabled);
		nextBtn.classList.add(galk.disabled);
	} else {
		bindNavigationButton(state, doc, prevBtn, `prev`);
		bindNavigationButton(state, doc, nextBtn, `next`);
	};

	let closeBtn = enforce(getSingleElemByClass(view, galk.close));
	/* when closing, return to the corresponding thumbnail: */
	closeBtn.addEventListener(`click`, () =>
		onCloseInlineView(state, doc), false);
};

const bindNotesOverlay = function(state, ovr, postInfo, notes) {
	dbg && assert(ovr instanceof Element);
	dbg && assert(typeof postInfo === `object`);
	dbg && assert(Array.isArray(notes));

	while (ovr.hasChildNodes()) {
		ovr.removeChild(ovr.firstChild);};

	let {width, height} = postInfo;
	if (!isInt(width) || !(width > 0)
		|| !isInt(height) || !(height > 0))
	{
		return;};

	let frag = ovr.ownerDocument.createDocumentFragment();
	for (let note of notes) {
		dbg && assert(typeof note.text === `string`);
		if (note.x < 0 || note.x >= width
			|| note.y < 0 || note.y >= height)
		{
			continue;};

		let el = ovr.ownerDocument.createElement(`figure`);
		el.insertAdjacentHTML(`beforeend`,
			`<figcaption>${xmlEscape(note.text)}</figcaption>`);

		el.style.left = `calc((${note.x} / ${width}) * 100%)`;
		el.style.top = `calc((${note.y} / ${height}) * 100%)`;

		let nw = Math.min(note.width, width - note.x);
		el.style.width = `calc((${nw} / ${width}) * 100%)`;

		let nh = Math.min(note.height, height - note.y);
		el.style.height = `calc((${nh} / ${height}) * 100%)`;

		frag.appendChild(el);
	};
	ovr.appendChild(frag);
};

const onCloseInlineView = function(state, doc) {
	maybeScrollIntoView(doc.defaultView,
		doc.getElementById(`post_${state.currentPostId}`) /* danbooru */
		|| doc.getElementById(`p${state.currentPostId}`) /* others */,
		`instant` /* smooth scroll can fail due to changing page height */);
};

const bindNavigationButton = function(state, doc, btn, direction) {
	enforce(btn instanceof HTMLAnchorElement);
	dbg && assert(direction === `prev` || direction === `next`);

	primeNavigationButton(state, doc, btn, direction);

	let onClick = ev => {
		if (!btn.classList.contains(galk.ready)) {
			primeNavigationButton(state, doc, btn, direction);
			if (ev) {
				ev.preventDefault();
				ev.stopPropagation();};
		};
	};

	btn.addEventListener(`click`, onClick, false);
};

const primeNavigationButton = async function(state, doc, btn, direction) {
	enforce(btn instanceof HTMLAnchorElement);
	dbg && assert(isPostId(state.currentPostId));
	dbg && assert(direction === `prev` || direction === `next`);

	if (btn.classList.contains(galk.pending)
		|| btn.classList.contains(galk.ready))
	{
		return;};

	btn.classList.add(galk.pending);

	let info;
	try {
		info = await tryNavigatePostInfo(
			state, state.currentPostId, direction, state.searchExpr);
	} finally {
		btn.classList.remove(galk.pending);};

	if (info === null) {
		return;};

	btn.href = stateAsFragment(
		{...state, currentPostId : info.postId},
		doc.location.href);

	btn.classList.add(galk.ready);
};

const bindThumbnailsList = function(state, doc, scopeElem) {
	let thumbs = scopeElem.getElementsByClassName(
		getThumbClass(getDomain(state)));

	log(`binding ${thumbs.length} thumbnail elements …`);
	for (let thumb of thumbs) {
		bindThumbnail(state, doc, thumb);};
};

const bindThumbnail = function(state, doc, thumb) {
	dbg && assert(thumb instanceof HTMLElement);
	let info = thumbnailInfo(state, thumb);
	if (info === null) {
		return;};

	thumb.classList.toggle(galk.selected,
		info.postId === state.currentPostId);

	let ovr = ensureThumbnailOverlay(state, doc, thumb, info);
	if (ovr !== null) {
		let inLink = enforce(getSingleElemByClass(ovr, galk['thumb-in-link']));

		inLink.href = stateAsFragment(
			{...state,
				currentPostId : (
					state.currentPostId === info.postId
						? undefined
						: info.postId)},
			doc.location.href);
	};
};

const ensureThumbnailOverlay = function(state, doc, thumb, info) {
	dbg && assert(thumb instanceof HTMLElement);
	dbg && assert(typeof info === `object`);
	dbg && assert(isPostId(info.postId));

	let ovr = getSingleElemByClass(thumb, galk['thumb-overlay']);
	if (ovr !== null) {
		return ovr;};

	ovr = doc.createElement(`nav`);
	ovr.classList.add(galk['thumb-overlay']);
	ovr.classList.add(galk[`thumb-overlay-${info.postId}`]);

	let title = thumbnailTitle(state, thumb);

	ovr.insertAdjacentHTML(`beforeend`,
		`<a class='${galk['thumb-ex-link']}'
			title='${xmlEscape(title)}'
			href='${xmlEscape(info.url.href)}'></a>
		<a class='${galk['thumb-in-link']}'
			title='${xmlEscape(title)}' href='#)}'></a>`);

	thumb.prepend(ovr);

	return ovr;
};

const ensureInlineView = function(state, doc, parentElem) {
	let ivPanel = getInlineView(state, parentElem);

	if (parentElem !== null && ivPanel === null) {
		ivPanel = doc.createElement(`section`);
		ivPanel.classList.add(galk['iv-panel']);
		parentElem.append(ivPanel);
	};

	return ivPanel;
};

const getInlineView = function(state, parentElem) {
	let ivPanel = null;
	if (parentElem instanceof HTMLElement) {
		ivPanel = getSingleElemByClass(parentElem, galk['iv-panel']);};

	if (!(ivPanel instanceof HTMLElement)) {
		return null;};

	return ivPanel;
};

const getInlineViewParent = function(state, doc) {
	return getSingleElemByClass(doc, `content-post`) /* r34xxx */
		|| getSingleElemByClass(doc, `content`) /* e621 / safebooru */
		|| doc.getElementById(`content`) /* danbooru */
		|| getSingleElemByClass(doc, `contain-push`) /* gelbooru */;
};

const getThumbnailsListElem = function(state, doc) {
	let elem = getInlineViewParent(state, doc);
	if (elem === null) {
		return null;};

	let firstThumb = elem.getElementsByClassName(
		getThumbClass(getDomain(state))).item(0);
	if (firstThumb === null) {
		return null;};

	return elem;

	/* note we may not get the direct parent of the .thumb elements
	because some sites (e.g. yande.re) nest them more deeply */
};

const thumbnailInfo = function(state, elem) {
	enforce(elem instanceof HTMLElement);

	let info = null;
	for (let c of chain([elem], elem.children)) {
		if (!(c instanceof HTMLAnchorElement)) {
			continue;}

		let url = tryParseHref(c.href);
		if (url === null) {
			continue;};

		let postId = postIdFromUrl(state, url);
		if (!isPostId(postId)) {
			continue;};

		if (info !== null) {
			/* thumbnail has multiple <a> children */
			return null;};

		info = {postId, url};
	};

	return info;
};

const thumbnailTitle = function(state, elem) {
	enforce(elem instanceof HTMLElement);

	let xs = getSingleElemByClass(elem, `preview`);
	if (xs === null) {
		return ``;};

	return xs.title.trim();
};

const isPostId = function(id) {
	return isInt(id) && id >= 0;
};

const domainKindOrderTermPrefixTbl = {
	danbooru : `order:`,
	gelbooru : `sort:`,
};

const searchExprContainsOrderTerm = function(state, searchExpr) {
	/* navigation cannot work when using non-default sort order */
	if (searchExpr === undefined) {
		return false;};

	let orderPrefix = domainKindOrderTermPrefixTbl[getDomain(state).kind];
	if (orderPrefix === undefined) {
		return false;};

	if (typeof searchExpr === `string`) {
		for (let s of searchExpr.split(/\s/)) {
			if (s.length === 0) {
				continue;};

			s = s.toLowerCase();
			if (s.startsWith(orderPrefix)) {
				return true;};
		};
	};

	return false;
};

const parseSearchExpr = function(state, expr) {
	//return {terms, order};
};

const getThumbClass = function({name}) {
	dbg && assert(typeof name === `string`);

	return name === `danbooru`
		? `post-preview`
		: `thumb`;
};

const ensureForwardDanbooruTooltipEvents = function(state, doc) {
	dbg && assert(doc instanceof HTMLDocument);
	enforce(doc.body instanceof HTMLBodyElement, `<body> element missing`);

	if (doc.getElementById(galk['forward-tooltip-events']) !== null) {
		return;};

	let scriptEl = doc.createElement(`script`);
	scriptEl.id = galk['forward-tooltip-events'];
	scriptEl.textContent = getForwardDanbooruTooltipEventsScriptText;
	doc.body.append(scriptEl);
};

const getForwardDanbooruTooltipEventsScriptText = `{
	/* refer to danbooru/app/javascript/src/javascripts/post_tooltips.js */

	let onEvent = function(ev) {
		let ovr = ev.target.closest('.${galk['thumb-overlay']}');
		if (ovr === null) {
			return;};

		/* forward to element where danbooru's handlers are attached: */

		let xs = ovr.parentElement.getElementsByTagName('img');
		if (xs.length !== 1) {
			return;};
		let newTarget = xs.item(0);

		/* precaution against infinite loops: */
		if (ovr.contains(newTarget)) {
			return;};

		if (ev instanceof MouseEvent) {
			newTarget.dispatchEvent(
				new MouseEvent(ev.type, ev));
		} else if (ev instanceof TouchEvent) {
			newTarget.dispatchEvent(
				new TouchEvent(ev.type, ev));
		};
	};

	document.addEventListener('mouseover', onEvent, false);
	document.addEventListener('mouseout', onEvent, false);
	document.addEventListener('touchstart', onEvent, false);
	document.addEventListener('touchend', onEvent, false);

	/* note: jQuery mouseenter/mouseleave events are
		equivalent to native mouseover/mouseout events */
};`;

/* --- post metadata --- */

/*

	note: post info is retained indefinitely, so it should only store
	immutable attributes (file type, dimensions, etc.).

*/

const ephemeralCacheExpireMs = 60000;

const ephemeralCacheAssign = function(cache, key, val) {
	dbg && assert(cache instanceof Map);

	dbg && assert(val !== undefined,
		`ephemeral cache entry value cannot be undefined`);

	dbg && assert(!cache.has(key),
		`cannot reassign unexpired ephemeral cache entry`);

	cache.set(key, val);
	setTimeout(
		() => cache.delete(key),
		ephemeralCacheExpireMs);
};

const postInfoTbl = new Map(); /* postId → postInfo */

const tryGetPostInfo = async function(state, postId) {
	dbg && assert(isPostId(postId));

	let info = postInfoTbl.get(postId);
	if (info !== undefined) {
		dbg && assert(typeof info === `object`);
		return info;};

	info = null;

	let requUrl = requestPostInfoUrl(state, postId);
	let xhr = await tryApiRequ(state, requUrl);
	if (xhr === null) {
		reportInvalidResponse(requUrl.href, xhr);
		return null;};

	switch (getDomain(state).kind) {
		case `danbooru` :
			try {
				info = singlePostInfoFromDanbooruApiPostsList(
					state, xhr.response);
			} catch (_) {
				reportInvalidResponse(requUrl.href, xhr);
				return null;};
			break;

		case `gelbooru` :
			if (!(xhr.responseXML instanceof Document)) {
				reportInvalidResponse(requUrl.href, xhr);
				return null;};

			try {
				info = singlePostInfoFromGelbooruApiPostsElem(
					state, xhr.responseXML.documentElement);
			} catch (_) {
				reportInvalidResponse(requUrl.href, xhr);
				return null;};
			break;

		default :
			dbg && assert(false);
	};

	if (info === null) {
		return null;};

	if (info.postId !== postId) {
		reportInvalidResponse(requUrl.href, xhr);
		return null;};

	postInfoTbl.set(postId, info);

	return info;
};

const notesCache = new Map(); /* postId → array */

const tryGetPostNotes = async function(state, postId) {
	dbg && assert(isPostId(postId));

	let notes = notesCache.get(postId);
	if (notes !== undefined) {
		dbg && assert(Array.isArray(notes));
		return notes;};

	let requUrl = requestPostNotesUrl(state, postId);
	let xhr = await tryApiRequ(state, requUrl);
	if (xhr === null) {
		reportInvalidResponse(requUrl.href, xhr);
		return null;};

	notes = null;
	switch (getDomain(state).kind) {
		case `danbooru` :
			try {
				notes = postNotesFromDanbooruApiNotesList(
					state, postId, xhr.response);
			} catch (_) {
				reportInvalidResponse(requUrl.href, xhr);
				return null;};
			break;

		case `gelbooru` :
			if (!(xhr.responseXML instanceof Document)) {
				reportInvalidResponse(requUrl.href, xhr);
				return null;};

			try {
				notes = postNotesFromGelbooruApiNotesElem(
					state, postId, xhr.responseXML.documentElement);
			} catch (_) {
				reportInvalidResponse(requUrl.href, xhr);
				return null;};
			break;

		default :
			dbg && assert(false);
	};

	if (!Array.isArray(notes)) {
		reportInvalidResponse(requUrl.href, xhr);
		return null;};

	ephemeralCacheAssign(notesCache, postId, notes);

	return notes;
};

const navigationRequCache = new Map(); /* href → result */

const tryNavigatePostInfo = async function(
	state, fromPostId, direction, searchExpr)
{
	dbg && assert(isPostId(fromPostId));
	dbg && assert(direction === `prev` || direction === `next`);

	let requUrl = requestNavigatePostInfoUrl(
		state, fromPostId, direction, searchExpr);
	if (requUrl === null) {
		return null;};

	let cacheKey = requUrl.href;
	let postId = navigationRequCache.get(cacheKey);
	if (postId !== undefined) {
		dbg && assert(isPostId(postId));
		let info = postInfoTbl.get(postId);
		if (info !== undefined) {
			dbg && assert(typeof info === `object`);
			return info;};
	};

	let xhr = await tryApiRequ(state, requUrl);
	if (xhr === null) {
		reportInvalidResponse(requUrl.href, xhr);
		return null;};

	let info = null;
	switch (getDomain(state).kind) {
		case `danbooru` :
			try {
				info = singlePostInfoFromDanbooruApiPostsList(
					state, resp.response);
			} catch (_) {
				reportInvalidResponse(requUrl.href, xhr);
				return null;};
			break;

		case `gelbooru` :
			if (!(xhr.responseXML instanceof Document)) {
				reportInvalidResponse(requUrl.href, resp);
				return null;};
			try {
				info = singlePostInfoFromGelbooruApiPostsElem(
					state, xhr.responseXML.documentElement);
			} catch (_) {
				reportInvalidResponse(requUrl.href, xhr);
				return null;};
			break;

		default :
			dbg && assert(false);
	};

	if (info === null) {
		return null;};
	dbg && assert(isPostId(info.postId));

	if (direction === `prev`
		? info.postId >= fromPostId
		: info.postId <= fromPostId)
	{
		/* result takes us in the wrong direction */
		reportInvalidResponse(requUrl.href, xhr);
		return null;};

	postInfoTbl.set(info.postId, info);

	ephemeralCacheAssign(navigationRequCache, cacheKey, info.postId);

	return info;
};

const singlePostInfoFromDanbooruApiPostsList = function(state, posts) {
	/* no results → null,
		malformed results → throw */

	if (!Array.isArray(posts) || posts.length !== 1) {
		throw new TypeError;};
	if (posts.length === 0) {
		return null;};

	let post = posts[0];
	if (typeof post !== `object`
		|| post === null
		|| !isPostId(post.id))
	{
		throw new TypeError;};

	let imageHref = post.file_url;

	let sampleHref = post.large_file_url || post.sample_url;
	if (sampleHref === imageHref) {
		sampleHref = undefined;};

	let thumbnailHref = post.preview_file_url || post.preview_url;
	if (thumbnailHref === imageHref) {
		thumbnailHref = undefined;};

	let md5 = post.md5;
	if (typeof md5 === `string` && /^[0-9a-fA-F]{32}$/.test(md5)) {
		md5 = md5.toLowerCase();
	} else {
		md5 = undefined;};

	return {
		postId : post.id,
		type : getMediaType(imageHref),
		imageHref,
		sampleHref,
		thumbnailHref,
		width : (post.image_width || post.width)|0,
		height : (post.image_height || post.height)|0,
		md5,};
};

const singlePostInfoFromGelbooruApiPostsElem = function(state, postsElem) {
	/* no results → null,
		malformed results → throw */

	if (!(postsElem instanceof Element)
		|| postsElem.tagName !== `posts`
		|| postsElem.children.length > 1)
	{
		throw new TypeError;};

	if (postsElem.children.length === 0) {
		return null;};

	let post = postsElem.children[0];
	if (!(post instanceof Element)
		|| post.tagName !== `post`)
	{
		throw new TypeError;};

	let postId = tryParsePostId(post.getAttribute(`id`));
	if (!isPostId(postId)) {
		throw new TypeError;};

	let imageHref = post.getAttribute(`file_url`);

	let sampleHref = post.getAttribute(`sample_url`);
	if (sampleHref === imageHref) {
		sampleHref = undefined;};

	let thumbnailHref = post.getAttribute(`preview_url`);
	if (thumbnailHref === imageHref) {
		thumbnailHref = undefined;
	} else if (getDomain(state).name === `r34xxx`) {
		/* r34xxx search result pages have the post id at the end of the
		thumbnail image url, but api search results don't,
		add it to avoid cache misses: */
		let url = tryParseHref(thumbnailHref);
		if (url !== null && url.search.length <= 1) {
			url.search = `?${postId}`;
			thumbnailHref = url.href;
		};
	};

	let md5 = post.getAttribute(`md5`).toLowerCase();
	if (!/^[0-9a-f]{32}$/.test(md5)) {
		md5 = undefined;};

	return {
		postId,
		type : getMediaType(imageHref),
		imageHref,
		sampleHref,
		thumbnailHref,
		width : post.getAttribute(`width`)|0,
		height : post.getAttribute(`height`)|0,
		md5,};
};

const postNotesFromDanbooruApiNotesList = function(state, postId, rawNotes) {
	/* no results → [],
		malformed results → throw */

	if (!Array.isArray(rawNotes)) {
		throw new TypeError;};

	let notes = [];

	for (let raw of rawNotes) {
		if (raw.post_id !== postId) {
			throw new Error;};
		if (typeof raw.body !== `string`) {
			throw new TypeError;};
		if (raw.is_active === false) {
			continue;};

		notes.push({
			text : raw.body,
			x : raw.x|0,
			y : raw.y|0,
			width : raw.width|0,
			height : raw.height|0,});
	};

	return notes;
};

const postNotesFromGelbooruApiNotesElem = function(state, postId, notesElem) {
	/* no results → [],
		malformed results → throw */

	dbg && assert(isPostId(postId));

	if (!(notesElem instanceof Element)
		|| notesElem.tagName !== `notes`)
	{
		throw new TypeError;};

	let notes = [];

	for (let el of notesElem.children) {
		if (tryParsePostId(el.getAttribute(`post_id`)) !== postId) {
			throw new Error;};

		notes.push({
			text : el.getAttribute(`body`),
			x : el.getAttribute(`x`)|0,
			y : el.getAttribute(`y`)|0,
			width : el.getAttribute(`width`)|0,
			height : el.getAttribute(`height`)|0,});
	};

	return notes;
};

const getMediaType = function(href) {
	let type = `image`;

	let url = tryParseHref(href);
	if (url !== null) {
		let p = url.pathname.toLowerCase();
		if (p.endsWith(`.webm`) || p.endsWith(`.mp4`)) {
			type = `video`;
		} else if (p.endsWith(`.swf`)) {
			type = `flash`;
		};
	};

	return type;
};

const reportInvalidResponse = function(href, xhr) {
	dbg && assert(typeof href === `string`);
	dbg && assert(typeof xhr === `object`);

	logError(`api request "${href}" returned invalid response:`,
		xhr === null ? `(null)` : xhr.responseText);
};

/* --- urls --- */

const fragmentPrefix = `#`+namespace+`:`;

const stateAsFragment = function(state, baseHref) {
	return fragmentPrefix+encodeURIComponent(JSON.stringify(state));
};

const stateFromFragment = function(frag) {
	if (typeof frag !== `string` || !frag.startsWith(fragmentPrefix)) {
		return null;};

	let src = frag.slice(fragmentPrefix.length);
	let state = tryParseJson(decodeURIComponent(src));
	if (typeof state !== `object`) {
		return null;};

	return state;
};

const stateFromUrl = function(url) {
	if (!(url instanceof URL)) {
		return null;};

	let origin = url.origin;

	if (getDomain({origin}) === undefined) {
		/* unknown site */
		return null;};

	return Object.freeze({
		currentPostId : postIdFromUrl({origin}, url),
		scaleMode : `fit`,
		...stateFromFragment(url.hash),
		origin : url.origin,
		searchExpr : searchExprFromUrl({origin}, url),});
};

const getDomain = function({origin}) {
	dbg && assert(typeof origin === `string`);

	let url = tryParseHref(origin);
	if (url === null) {
		return null;};

	let domain = hostnameDomainTbl[url.hostname];
	if (typeof domain !== `object`) {
		return null;};

	dbg && assert(typeof domain.name === `string`);
	dbg && assert(typeof domain.kind === `string`);
	dbg && assert(typeof domain.subkind === `string`
		|| domain.kind !== `danbooru`);

	return domain;
};

test(_ => {
	/* e621 search queries */

	let url = new URL(`https://e621.net`);
	for (let [path, queryString, expect] of [
		[`/post`, ``, undefined],
		[`/post/`, ``, undefined],
		[`/post/index`, ``, undefined],
		[`/post/index/`, ``, undefined],
		[`/post/index/1`, ``, undefined],
		[`/post/index/1/`, ``, undefined],
		[`/post/index/1/id:<1837141 order:id`, ``, `id:<1837141 order:id`],
		[`/post/index/1/id:<1837141 order:id/`, ``, `id:<1837141 order:id`],
		[`/post/index/1/id:<1837141 order:id//`, ``, undefined],
		[`/post/index/1/id:<1837141 order:id/asdf`, ``, undefined],
		[`/post/index//id:<1837141 order:id`, ``, undefined],
		[`/post/index/1//id:<1837141 order:id`, ``, undefined],
		[`/post/index/asdf/id:<1837141 order:id`, ``, undefined],
		[`/post`, `tags=id:<1837141 order:id`, `id:<1837141 order:id`],
		[`/post/`, `tags=id:<1837141 order:id`, `id:<1837141 order:id`],
		[`/post/index`, `tags=id:<1837141 order:id`, `id:<1837141 order:id`],
		[`/post/index/`, `tags=id:<1837141 order:id`, `id:<1837141 order:id`],
		[`/post/index/1`, `tags=id:<1837141 order:id`, `id:<1837141 order:id`],
		[`/post/index/1/`, `tags=id:<1837141 order:id`, `id:<1837141 order:id`],
		/* path takes precedence over querystring: */
		[`/post/index/1/absurdres`, `tags=id:<1837141 order:id`, `absurdres`],])
	{
		url.pathname = path;
		url.search = queryString;

		assert(isGalleryUrl(url));

		let {searchExpr} = stateFromUrl(url);
		assert(searchExpr === expect);
	};
});

test(_ => {
	/* danbooru search queries */

	let url = new URL(`https://danbooru.donmai.us`);
	for (let [path, queryString, expect] of [
		[`/`, ``, undefined],
		[`/posts`, ``, undefined],
		[`/posts/`, ``, undefined],
		[`/posts`, `tags=id:<1837141 order:id`, `id:<1837141 order:id`],
		[`/posts/`, `tags=id:<1837141 order:id`, `id:<1837141 order:id`],])
	{
		url.pathname = path;
		url.search = queryString;

		assert(isGalleryUrl(url));

		let {searchExpr} = stateFromUrl(url);
		assert(searchExpr === expect);
	};
});

test(_ => {
	/* gelbooru search queries */

	let url = new URL(`https://rule34.xxx`);
	for (let [path, queryString, expect] of [
		[`/`, `page=post&s=list&tags=all`, undefined],
		// todo
		])
	{
		url.pathname = path;
		url.search = queryString;

		assert(isGalleryUrl(url));

		let {searchExpr} = stateFromUrl(url);
		assert(searchExpr === expect);
	};
});

const searchExprFromUrl = function({origin}, url) {
	if (!(url instanceof URL)) {
		return undefined;};

	let domain = getDomain({origin});

	let searchExpr = url.searchParams.get(`tags`);

	if (domain.kind === `danbooru`
		&& domain.subkind !== `danbooru`)
	{
		let xs = tryParsePathFromUrl(url);
		if (xs !== null
			&& xs.length === 4
			&& xs[0] === `post`
			&& xs[1] === `index`
			&& /^\d+$/.test(xs[2]))
		{
			/* path takes precedence searchParams */
			searchExpr = xs[3];
		};
	};

	if (typeof searchExpr !== `string`
		|| !/\S/.test(searchExpr))
	{
		/* contains only whitespace characters */
		return undefined;};

	searchExpr = searchExpr.trim();

	if (domain.kind === `gelbooru`
		&& searchExpr === `all`)
	{
		return undefined;};

	return searchExpr;
};

const isGalleryUrl = function(url) {
	if (!(url instanceof URL)) {
		return false;};

	let domain = hostnameDomainTbl[url.hostname];
	if (domain === undefined) {
		/* unknown site */
		return false;};

	switch (domain.kind) {
		case `danbooru` :
			let xs = tryParsePathFromUrl(url);
			if (domain.subkind === `danbooru`) {
				return xs !== null
					&& (xs.length === 0
						|| (xs.length === 1
							&& xs[0] === `posts`));
			} else {
				return xs !== null
					&& xs[0] === `post`
					&& (xs.length === 1 || xs[1] === `index`);
			};
			break;

		case `gelbooru` :
			return (url.pathname === `/` || url.pathname === `/index.php`)
				&& url.searchParams.get(`page`) === `post`
				&& url.searchParams.get(`s`) === `list`;

		default :
			dbg && assert(false);
	};

};

test(_ => {
	assert(isGalleryUrl(new URL(
		`https://e621.net/post/index/1/absurdres?tags=id:<1837141 order:id`)));

	// todo
});

const postIdFromUrl = function({origin}, url) {
	if (!(url instanceof URL)) {
		return -1;};

	let domain = getDomain({origin});
	switch (domain.kind) {
		case `danbooru` :
			let xs = tryParsePathFromUrl(url);
			if (domain.subkind === `danbooru`) {
				if (xs !== null && xs[0] === `posts`) {
					return tryParsePostId(xs[1]);};
			} else {
				if (xs !== null && xs[0] === `post` && xs[1] === `show`) {
					return tryParsePostId(xs[2]);};
			};
			break;

		case `gelbooru` :
			if ((url.pathname === `/` || url.pathname === `/index.php`)
				&& url.searchParams.get(`page`) === `post`
				&& url.searchParams.get(`s`) === `view`)
			{
				return tryParsePostId(url.searchParams.get(`id`));
			};
			break;

		default :
			dbg && assert(false);
	};

	return -1;
};

test(_ => {
	// todo
});

const requestPostInfoUrl = function(state, postId) {
	dbg && assert(isPostId(postId));

	let url = new URL(state.origin);
	let domain = getDomain(state);

	switch (domain.kind) {
		case `danbooru` :
			url.pathname = `/post/index.json`;
			url.searchParams.set(`limit`, `1`);
			url.searchParams.set(`tags`, `id:${postId}`);

			return url;

		case `gelbooru` :
			url.pathname = `/`;
			url.searchParams.set(`page`, `dapi`);
			url.searchParams.set(`s`, `post`);
			url.searchParams.set(`q`, `index`);
			url.searchParams.set(`limit`, `1`);
			url.searchParams.set(`tags`, `id:${postId}`);
			return url;

		default :
			dbg && assert(false);
	};
};

const requestPostNotesUrl = function(state, postId) {
	dbg && assert(isPostId(postId));

	let url = new URL(state.origin);
	let domain = getDomain(state);

	switch (domain.kind) {
		case `danbooru` :
			if (domain.subkind === `danbooru`) {
				url.pathname = `/notes.json`;
				url.searchParams.set(`search[post_id]`, `${postId}`);
				url.searchParams.set(`search[is_active]`, `true`);
				url.searchParams.set(`limit`, `1000`);
			} else {
				url.pathname = `/note/index.json`;
				url.searchParams.set(`post_id`, `${postId}`);};

			return url;

		case `gelbooru` :
			url.pathname = `/`;
			url.searchParams.set(`page`, `dapi`);
			url.searchParams.set(`s`, `note`);
			url.searchParams.set(`q`, `index`);
			url.searchParams.set(`post_id`, `${postId}`);
			return url;

		default :
			dbg && assert(false);
	};
};

const requestNavigatePostInfoUrl = function(
	state, postId, direction, searchExpr)
{
	dbg && assert(isPostId(postId));
	dbg && assert(direction === `prev` || direction === `next`);
	dbg && assert(!searchExprContainsOrderTerm(searchExpr));

	let url = new URL(state.origin);
	let domain = getDomain(state);

	switch (domain.kind) {
		case `danbooru` : {
			url.searchParams.set(`limit`, `1`);
			url.pathname = `/post/index.json`;

			let q = ``;

			if (domain.subkind === `danbooru`) {
				url.searchParams.set(`page`,
					direction === `prev`
						? `b${postId}` /* before */
						: `a${postId}` /* after */);
			} else {
				if (direction === `prev`) {
					if (domain.subkind === `e621`) {
						url.searchParams.set(`before_id`, `${postId}`);
					} else {
						q += `id:<${postId} order:-id`;};
				} else {
					q += `id:>${postId} order:id`;};
			};

			if (typeof searchExpr === `string` && searchExpr.length !== 0) {
				q += (q ? ` ` : ``)+searchExpr;};

			url.searchParams.set(`tags`, q);

			return url;
		};

		case `gelbooru` : {
			url.pathname = `/`;
			url.searchParams.set(`page`, `dapi`);
			url.searchParams.set(`s`, `post`);
			url.searchParams.set(`q`, `index`);
			url.searchParams.set(`limit`, `1`);

			let q =
				direction === `prev`
					? `id:<${postId} sort:id:desc`
					: `id:>${postId} sort:id:asc`;

			if (typeof searchExpr === `string` && searchExpr.length !== 0) {
				q += ` `+searchExpr;};

			url.searchParams.set(`tags`, q);

			return url;
		};

		default :
			dbg && assert(false);
	};
};

test(_ => {
	let url = requestNavigatePostInfoUrl(
		{origin : `https://rule34.xxx`},
		265, `next`, `absurdres`);

	assert(url.origin === `https://rule34.xxx`);
	assert(url.pathname === `/`);
	assert(url.searchParams.get(`page`) === `dapi`);
	assert(url.searchParams.get(`s`) === `post`);
	assert(url.searchParams.get(`q`) === `index`);
	assert(url.searchParams.get(`limit`) === `1`);
	assert(url.searchParams.get(`tags`) === `id:>265 sort:id:asc absurdres`);

	// todo
});

test(_ => {
	let url = requestNavigatePostInfoUrl(
		{origin : `https://testbooru.donmai.us`},
		265, `next`, `absurdres`);

	assert(url.origin === `https://testbooru.donmai.us`);
	assert(url.pathname === `/post/index.json`);
	assert(url.searchParams.get(`limit`) === `1`);
	assert(url.searchParams.get(`page`) === `a265`);
	assert(url.searchParams.get(`tags`) === `absurdres`);

	// todo
});

const postPageUrl = function(state, postId) {
	dbg && assert(isPostId(postId));

	let url = new URL(state.origin);
	let domain = getDomain(state);

	switch (domain.kind) {
		case `danbooru` :
			if (domain.subkind === `danbooru`) {
				url.pathname = `/posts/${postId}`;
			} else {
				url.pathname = `/post/show/${postId}`;};
			return url;

		case `gelbooru` :
			url.pathname = `/index.php`;
			url.searchParams.set(`page`, `post`);
			url.searchParams.set(`s`, `view`);
			url.searchParams.set(`id`, `${postId}`);
			return url;

		default :
			dbg && assert(false);
	};

	return null;
};

/* --- utilities --- */

const requestTimeoutMs = 10000;

const tryApiRequ = async function(state, url) {
	return await tryHttpGet(url,
		getDomain(state).kind === `danbooru`
			? `json`
			: `document`);
};

const tryHttpGet = async function(...args) {
	try {
		return await httpGet(...args);
	} catch (x) {
		logError(x.message);
		return null;};
};

const httpGet = function(url, responseType) {
	dbg && assert(url instanceof URL);
	dbg && assert(typeof responseType === `string`);

	return new Promise((resolve, reject) => {
		let onFailure = function() {
			return reject(new Error(
				`GET request "${url.href}" failed with status `
				+`"${this.statusText}"`));
		};

		let onSuccess = function() {
			if (this.status === 200) {
				return resolve(this);
			} else {
				return onFailure.call(this);};
		};

		let xhr = Object.assign(new XMLHttpRequest, {
			responseType,
			timeout : requestTimeoutMs,
			onload : onSuccess,
			onabort : onFailure,
			onerror : onFailure,
			ontimeout : onFailure,});

		xhr.open(`GET`, url.href);
		xhr.send();
	});
};

const getSingleElemByClass = function(scopeElem, className) {
	dbg && assert(typeof className === `string`);
	dbg && assert(scopeElem instanceof Element
		|| scopeElem instanceof Document);

	let elems = scopeElem.getElementsByClassName(className);

	if (elems.length !== 1) {
		return null;};

	return elems.item(0);
};

const tryParseHref = function(href) {
	try {
		return new URL(href);
	} catch (x) {
		return null;};
};

const tryParseJson = function(s) {
	try {
		return JSON.parse(s);
	} catch (x) {
		return undefined;};
};

const tryParsePathFromUrl = function(url) {
	if (!(url instanceof URL)) {
		return null;};

	return tryParsePath(decodeURIComponent(url.pathname));
};

test(_ => {
	let url = new URL(`https://x`)
	url.pathname = `/id:<1837141 order:id`;

	let xs = tryParsePathFromUrl(url);
	assert(xs[0] === `id:<1837141 order:id`);
});

const tryParsePath = function(s) {
	/* s is expected to already have been decoded via decodeURIComponent() */

	if (typeof s !== `string` || s.length === 0 || s[0] !== `/`) {
		return null;};

	let components = [];

	for (let i = 1, j = 1, n = s.length; i < n; ++i) {
		if (s[i] === `/`) {
			components.push(s.slice(j, i));
			j = i + 1;
		} else if (i === n - 1) {
			components.push(s.slice(j, n));
		};
	};

	return components;
};

test(_ => {
	assert(tryParsePath(``) === null);
	assert(tryParsePath(`post/`) === null);
	assert(sequiv(tryParsePath(`/`), []));
	assert(sequiv(tryParsePath(`/post`), [`post`]));
	assert(sequiv(tryParsePath(`/post/`), [`post`]));
	assert(sequiv(tryParsePath(`/post//`), [`post`, ``]));
	assert(sequiv(tryParsePath(`/post/index`), [`post`, `index`]));
	assert(sequiv(tryParsePath(`/post/index/`), [`post`, `index`]));
	assert(sequiv(tryParsePath(`/post//index`), [`post`, ``, `index`]));
	assert(sequiv(tryParsePath(`/post//index/`), [`post`, ``, `index`]));
	assert(sequiv(tryParsePath(`/post/index//`), [`post`, `index`, ``]));
});

const tryParsePostId = function(s) {
	if (typeof s !== `string`) {
		return -1;};

	let len = s.length;
	let lenNibble = len & 0b1111; /* prevent excessive iteration */
	let c0 = s.charCodeAt(0) - 48;

	let invalid =
		(lenNibble === 0)
		| (len > 10)
		| ((c0 >>> 1) > 4) /* c0 < 0 || c0 > 9 */
		| ((c0 << 3) < (lenNibble >>> 1)) /* c0 === 0 && lenNibble !== 1 */
		| (lenNibble === 10 && s > `2147483647`);

	let n = c0;
	for (let i = 1; i < lenNibble; ++i) {
		let c = s.charCodeAt(i) - 48;
		n = Math.imul(10, n) + c;
		invalid |= ((c >>> 1) > 4); /* c < 0 || c > 9 */
	};

	return n | -invalid;
};

const tryParseXml = function(src) {
	/* DOMParser.parseFromString() may return a <parsererror> document instead
	of throwing when the input is malformed

	while this solution seems to reliably identify malformed xml,
	it unfortunately cannot prevent 'XML Parsing Error:' messages from being
	written to the console */

	if (typeof src !== `string`) {
		return null;};

	let key = `a`+Math.random().toString(32);

	let parser = new DOMParser;

	let doc = null;
	try {
		doc = parser.parseFromString(
			src+`<?${key}?>`, `application/xml`);
	} catch (x) {};

	if (!(doc instanceof XMLDocument)) {
		return null;};

	let lastNode = doc.lastChild;
	if (!(lastNode instanceof ProcessingInstruction)
		|| lastNode.target !== key
		|| lastNode.data !== ``)
	{
		return null;};

	doc.removeChild(lastNode);

	/* in some cases, chrome chooses to insert its <parsererror> into the root
	element, leaving the rest of the document intact (including our processing
	instruction).

	see: chromium/src/third_party/blink/renderer/core/xml/parser/xml_errors.cc

	however, chrome will never insert more than one <parsererror> element.
	so to detect this case, we'll force an error which triggers this behaviour
	and check whether the result has the same number of <parsererror> elements
	as the previous result. */

	let errElemCount =
		doc.documentElement.getElementsByTagName(`parsererror`).length;
	if (errElemCount !== 0) {
		let errDoc = null;
		try {
			errDoc = parser.parseFromString(
				src+`<?`, `application/xml`);
		} catch (x) {};

		if (!(errDoc instanceof XMLDocument)
			|| errDoc.documentElement.getElementsByTagName(`parsererror`).length
				=== errElemCount)
		{
			return null;};
	};

	return doc;
};

const xmlEscape = function(chars) {
	let s = ``;
	for (let c of chars) {
		switch (c) {
			case `"` : s += `&quot;`; break;
			case `'` : s += `&apos;`; break;
			case `<` : s += `&lt;`; break;
			case `>` : s += `&gt;`; break;
			case `&` : s += `&amp;`; break;
			default : s += c; break;
		};
	};
	return s;
};

test(_ => {
	assert(xmlEscape(`>\udbff\udfff<`) === `&gt;\udbff\udfff&lt;`);
});

const maybeScrollIntoView = function(
	viewport /* window */, el, behavior = `smooth`)
{
	if (!(el instanceof Element)) {
		return;};

	let rect = el.getBoundingClientRect();
	if (!viewport
		|| rect.left < 0
		|| rect.right > viewport.innerWidth
		|| rect.top < 0
		|| rect.bottom > viewport.innerHeight)
	{
		el.scrollIntoView({behavior});
	};
};

const sequiv = function(xs, ys, pred = Object.is) {
	/* compare two sequences for equivalence */

	if (xs === ys) {
		return true;};

	let xsIter = xs[Symbol.iterator]();
	let ysIter = ys[Symbol.iterator]();
	let xObj, yObj;

	dbg && assert(typeof xsIter === `object`);
	dbg && assert(typeof ysIter === `object`);

	while (true) {
		xObj = xsIter.next();
		yObj = ysIter.next();

		dbg && assert(typeof xObj === `object`);
		dbg && assert(typeof yObj === `object`);

		if (xObj.done) {
			break;};

		if (yObj.done) {
			return false;};

		if (!pred(xObj.value, yObj.value)) {
			return false;};
	};

	return yObj.done;
};

const chainIterProto = {
	next() {
		while (this.idx < this.xss.length) {
			if (this.subIter === null) {
				this.subIter =
					this.xss[this.idx][Symbol.iterator]();};

			let next = this.subIter.next();
			if (!next.done) {
				return next;};

			this.subIter = null;
			++this.idx;
		};

		return {done : true};
	},

	[Symbol.iterator]() {return this;},
};

const chainResultProto = {
	[Symbol.iterator]() {
		return {
			__proto__ : chainIterProto,
			xss : this.xss,
			idx : 0,
			subIter : null,};
	},
};

const chain = function(...xss) {
	dbg && xss.every(xs => assert(isIterable(xs)));
	return {
		__proto__ : chainResultProto,
		xss,};
};

const isIterable = function(xs) {
	return xs != null && typeof xs[Symbol.iterator] === `function`;
};

const isInt =  function(x) {
	return (x|0) === x;
};

const enforce = function(cond, msg = `enforcement failed`) {
	if (!cond) {
		let err = new Error(msg);
		err.message += ` - ${err.stack}`;
		throw err;
	};
	return cond;
};

const assert = function(cond, msg) {
	if (!cond) {
		debugger;
		console.assert(cond,
			...(runtime === `browser` ? [`assertion failed:`] : []),
			...(msg ? [msg] : []));
		console.trace();
		throw new Error(`${msg || 'assertion failed'}`);
	};
};

const log = function(...xs) {
	console.log(`[${namespace}]`, ...xs);
};

const logInfo = function(...xs) {
	console.info(`[${namespace}]`, ...xs);
};

const logWarn = function(...xs) {
	console.warn(`[${namespace}]`, ...xs);
};

const logError = function(...xs) {
	console.error(`[${namespace}]`, ...xs);
};

/* --- styles --- */

const ensureApplyGlobalStyleRules = function(state, doc, getRules) {
	dbg && assert(doc instanceof HTMLDocument);
	enforce(doc.head instanceof HTMLHeadElement, `<head> element mising`);

	if (doc.getElementById(galk.globalStylesheet)
		instanceof HTMLStyleElement)
	{
		log(`global stylesheet already applied`);
		return;};
	log(`applying global stylesheet …`);

	let root = document.documentElement;
	let domain = getDomain(state);
	root.classList.add(galk[`domain-name-${domain.name}`]);
	root.classList.add(galk[`domain-kind-${domain.kind}`]);
	if (domain.subkind !== undefined) {
		root.classList.add(galk[`domain-subkind-${domain.subkind}`]);};
	root.classList.add(galk[`theme-${getInlineViewTheme(domain, doc)}`]);

	let style = doc.createElement(`style`);
	style.id = galk.globalStylesheet;
	doc.head.appendChild(style);

	for (let rule of getRules()) {
		style.sheet.insertRule(rule, style.sheet.cssRules.length);};
};

const getInlineViewTheme = function({name}, doc) {
	/* dark page → light theme
	light page → dark theme */

	if (name === `danbooru` || name === `safebooru`) {
		return `dark`;

	} else if (name === `gelbooru`) {
		for (let s of doc.styleSheets) {
			let url = tryParseHref(s.href);
			if (url !== null && url.pathname === `/responsive_dark.css`) {
				return `light`;};
		};
		return `dark`;

	} else if (name === `r34xxx`) {
		for (let s of doc.styleSheets) {
			let url = tryParseHref(s.href);
			if (url !== null && (
				url.pathname === `/css/desktop_bip.css`
				|| url.pathname === `/css/mobile_bip.css`))
			{
				return `light`;};
		};
		return `dark`;
	};

	return `light`;
};

const getGlobalStyleRules = function(domain) {
	let thumbClass = getThumbClass(domain);

	let svgCircleArrowUpHref = svgHref(svgCircleArrow(0));
	let svgCircleArrowRightHref = svgHref(svgCircleArrow(90));
	let svgCircleArrowDownHref = svgHref(svgCircleArrow(180));
	let svgCircleArrowLeftHref = svgHref(svgCircleArrow(270));

	return [
		/* --- vars --- */

		`:root {
			--${galk['c-iv-bg']} : hsl(232, 17%, 46%);
			--${galk['r-iv-inact-opacity']} : 0.6;
			--${galk['c-iv-action']} : hsl(33, 100%, 70%);
			--${galk['c-ex-link']} : hsl(233, 100%, 75%);
			--${galk['c-note-bg']} : hsla(60, 100%, 96.7%, 0.3);
			--${galk['c-note-border']} : hsla(0, 0%, 0%, 0.3);
			--${galk['c-note-caption']} : hsla(0, 0%, 10%, 1);
			--${galk['c-note-caption-bg']} : hsla(60, 100%, 96.7%, 0.95);
			--${galk['d-iv-width']} : 185mm;
		}`,

		`:root.${galk['theme-dark']} {
			--${galk['c-base']} : hsla(0, 0%, 30%, 0.5);
		}`,

		`:root.${galk['theme-light']} {
			--${galk['c-base']} : hsla(0, 0%, 100%, 0.5);
		}`,

		/* --- inline view --- */

		`.${galk['iv-panel']} {
			display : flex;
			flex-direction : column;
			align-items : center;
			justify-content : flex-start;
			min-height : calc(74mm + 50vh);
		}`,

		`.${galk['iv-header']}, .${galk['iv-footer']} {
			max-width : 100vw;
			width : var(--${galk['d-iv-width']});
			min-height : 11mm;
		}`,

		`.${galk['iv-header']} > *,
		.${galk['iv-footer']} > *
		{
			background-color : var(--${galk['c-base']});
			opacity : var(--${galk['r-iv-inact-opacity']});
		}`,

		`.${galk['iv-content-panel']} {
			display : flex;
			align-items : center;
			max-width : 100%; /* make extra-wide images overflow to the right */
			min-height : 37mm;
		}`,

		`.${galk['iv-content-stack']} {
			display : grid;
			justify-items : center;
			align-items : center;
		}`,

		`.${galk['iv-content-stack']} > * {
			grid-column : 1;
			grid-row : 1;
		}`,

		`.${galk['iv-content-stack']} > [hidden] {
			display : none; /* necessary due to 'reset' stylesheets */
		}`,

		`.${galk['iv-content-stack']}.${galk['scale-fit']} {
			max-width : 100vw;
		}`,

		`.${galk['iv-content-stack']}.${galk['scale-fit']} > * {
			max-width : 100%;
			max-height : 100vh;
		}`,

		`.${galk['iv-content-stack']} > .${galk.media} {
			z-index : 2;
		}`,

		`.${galk['iv-content-stack']} > .${galk['media-sample']} {
			z-index : 1;
		}`,

		`.${galk['iv-content-stack']} > .${galk['media-thumbnail']} {
			z-index : 0;
			opacity : 0.5;
			filter : blur(1.32mm);
		}`,

		`.${galk['iv-content-stack']} > .${galk['media-sample']},
		.${galk['iv-content-stack']} > .${galk['media-thumbnail']}
		{
			width : auto;
			height : 100%;
		}`,

		`.${galk['iv-content-stack']} > .${galk['media-unavailable']} {
			margin : 0;
			width : var(--${galk['d-iv-width']});
			height : 74mm;
			background-color : var(--${galk['c-iv-bg']});
			background-size : 70%;
			background-repeat : no-repeat;
			background-position : center;
			opacity : 0.75;
		}`,

		`.${galk['iv-content-stack']} > .${galk['note-overlay']} {
			z-index : 3;
			width : 100%;
			height : 100%;
		}`,

		`.${galk['note-overlay']} {
			position : relative;
			/* don't obstruct interaction with underlying elements: */
			visibility : hidden;
		}`,

		`.${galk['note-overlay']} > figure {
			position : absolute;
			visibility : visible;
			margin : 0;
			z-index : 0;
			background : var(--${galk['c-note-bg']});
		}`,

		`.${galk['note-overlay']} > figure,
		.${galk['note-overlay']} > figure > figcaption
		{
			border-style : solid;
			border-width : 1px;
			border-color : var(--${galk['c-note-border']});
		}`,

		`.${galk['iv-panel']}:not(.${galk['notes-visible']})
			.${galk['note-overlay']} > figure
		{
			display : none;
		}`,

		`.${galk['note-overlay']} > figure > figcaption {
			visibility : hidden;
			position : absolute;
			padding : 1mm;
			top : calc(100% + 1.85mm);
			border-color : var(--${galk['c-note-caption']});
			color : var(--${galk['c-note-caption']});
			background : var(--${galk['c-note-caption-bg']});
		}`,

		`.${galk['note-overlay']} > figure:hover {
			z-index : 1;
		}`,

		`.${galk['note-overlay']} > figure:hover > figcaption {
			visibility : visible;
		}`,

		/* --- controls --- */

		`.${galk['iv-ctrls']} {
			display : flex;
			flex-direction : row;
			align-items : stretch;
			justify-content : center;
		}`,

		`.${galk['iv-ctrls']} > * {
			/* equal sizes: */
			flex-basis : 0;
			flex-grow : 1;

			/* centre contents: */
			display : flex;
			align-items : center;
			justify-content : center;
		}`,

		`.${galk['iv-ctrls']} > a:hover,
		.${galk['iv-panel']}.${galk['notes-visible']}
			.${galk['iv-ctrls']} > .${galk.notes}
		{
			opacity : 1;
		}`,

		`.${galk['iv-ctrls']} > * > .${galk['btn-icon']} {
			margin : 0;
			width : 7.4mm;
			height : 7.4mm;
			background-size : cover;
			background-image : url(${svgHref(svgCircleRing)});
		}`,

		`.${galk['iv-ctrls']} > .${galk.scale}.${galk.full}
			> .${galk['btn-icon']}
		{
			background-image : url(${svgHref(svgCircleExpand)});
		}`,

		`.${galk['iv-ctrls']} > .${galk.scale}.${galk.fit}
			> .${galk['btn-icon']}
		{
			background-image : url(${svgHref(svgCircleContract)});
		}`,

		`.${galk['iv-ctrls']} > .${galk.prev}.${galk.ready}
			> .${galk['btn-icon']}
		{
			background-image : url(${svgCircleArrowRightHref});
		}`,

		`.${galk['iv-ctrls']} > .${galk.ex}:hover {
			background-color : var(--${galk['c-ex-link']});
		}`,

		`.${galk['iv-ctrls']} > .${galk.ex} > .${galk['btn-icon']} {
			background-image : url(${svgHref(svgCircleLink)});
		}`,

		`.${galk['iv-ctrls']} > .${galk.next}.${galk.ready}
			> .${galk['btn-icon']}
		{
			background-image : url(${svgCircleArrowLeftHref});
		}`,

		`.${galk['iv-ctrls']} > .${galk.close}:hover {
			background-color : var(--${galk['c-iv-action']});
		}`,

		`.${galk['iv-ctrls']} > .${galk.close} > .${galk['btn-icon']} {
			background-image : url(${svgCircleArrowUpHref});
		}`,

		`.${galk['iv-ctrls']} > .${galk.notes} > .${galk['btn-icon']} {
			background-image : url(${svgHref(svgCircleNote)});
		}`,

		`.${galk['iv-panel']}:not(.${galk['notes-visible']})
			.${galk['iv-ctrls']} > .${galk.notes}:hover
			> .${galk['btn-icon']}
		{
			opacity : var(--${galk['r-iv-inact-opacity']});
		}`,

		`.${galk['iv-ctrls']} > .${galk.pending},
		.${galk['iv-ctrls']} > .${galk.disabled}
		{
			pointer-events : none;
		}`,

		`.${galk['iv-ctrls']} > .${galk.prev}.${galk.pending}
			> .${galk['btn-icon']},
		.${galk['iv-ctrls']} > .${galk.next}.${galk.pending}
			> .${galk['btn-icon']}
		{
			background-image : url(${svgHref(svgCircleSpinner)});
			${spinnerStyleRules}
		}`,

		/* --- thumbnails --- */

		`.${thumbClass} {
			position : relative;
			isolation : isolate;

			/* centre the thumbnail images: */
			display : inline-flex !important;
			flex-direction : column;
			align-items : center;
			justify-content : center;
		}`,

		`:root.${galk['domain-yandere']} .${thumbClass} {
			display : flex !important; /* thumbnails nested in <li> */
		}`,

		`:root.${galk['domain-e621']} .${thumbClass} > .post-score {
			margin-top : unset !important;
			margin-bottom : unset !important;
		}`,

		`.${thumbClass} > .${galk['thumb-overlay']} {
			display : flex;
			flex-direction : column;
			position : absolute;
			z-index : 32767;
			top : 0;
			left : 0;
			bottom : 0;
			right : 0;
		}`,

		`.${thumbClass} > .${galk['thumb-overlay']} > * {
			display : block;
			flex-grow : 1;
		}`,

		`.${thumbClass} > .${galk['thumb-overlay']} > a {
			background-position : center;
			background-repeat : no-repeat;
			background-size : 30%;
			opacity : 0.7;
		}`,

		`.${thumbClass} > .${galk['thumb-overlay']}
			> a.${galk['thumb-ex-link']}:hover
		{
			background-image : url(${svgHref(svgCircleLink)});
			background-color : var(--${galk['c-ex-link']});
		}`,

		`.${thumbClass} > .${galk['thumb-overlay']}
			> a.${galk['thumb-in-link']}:hover,
		.${thumbClass}.${galk.selected} > .${galk['thumb-overlay']}
			> a.${galk['thumb-in-link']}
		{
			background-image : url(${svgCircleArrowDownHref});
			background-color : var(--${galk['c-iv-action']});
		}`,

		`.${thumbClass}.${galk.selected} > .${galk['thumb-overlay']}
			> a.${galk['thumb-in-link']}:hover
		{
			background-image : url(${svgCircleArrowUpHref});
		}`,

		/* --- animation --- */

		`.${galk['animate-to-hidden']} {
			animation-name : ${galk['to-hidden']};
			animation-iteration-count : 1;
			animation-duration : 0.2s;
			animation-timing-function : linear;
			animation-fill-mode : forwards;
		}`,

		`@keyframes ${galk['to-hidden']} {
			from {}
			to {
				visibility : hidden;
				opacity : 0;
			}
		}`,

		`@keyframes ${galk.rotate} {
			from {}
			to {transform : rotate(1.0turn);}
		}`,

		/* --- miscellaneous --- */

		`:root.${galk['domain-name-r34xxx']},
		:root.${galk['domain-name-r34xxx']} > body
		{
			/* remove style on rule34's mobile layout which causes full-size
			images to be cropped: */
			overflow-x : unset;
		}`,
	];
};

const spinnerStyleRules =
	`animation-name : ${galk.rotate};
	animation-iteration-count : infinite;
	animation-duration : 0.36s;
	animation-timing-function : linear;`;

/* --- assets --- */

const svgHref = function(src) {
	if (typeof Blob === `undefined`) {
		return svgDataHref(src);
	} else {
		return svgBlobHref(src);};
};

const svgBlobHref = function(src) {
	return URL.createObjectURL(
		new Blob([src], {type : `image/svg+xml`}));
};

const svgDataHref = function(src) {
	return `data:image/svg+xml,`+encodeURIComponent(src);
};

const svgEmptyPlaceholder = function(w, h) {
	return `<svg xmlns='http://www.w3.org/2000/svg'`
		+` width='${w|0}' height='${h|0}'><path/></svg>`;
};

const svgMediaUnavailable = function(postId) {
	dbg && assert(isPostId(postId));

	return `<svg xmlns='http://www.w3.org/2000/svg' width='1000' height='380'>
		<g fill='#fff'>
			<path d='M29 0C13 0 0 13 0 29v322c0 16 13 29 29 29h242c16 0 29-13
				29-29V116L189 0zm0 26h149l96 100v225c0 3 0 3-3 3H29c-3
				0-3 0-3-3V29c0-3 0-3 3-3z'/>
			<path d='M183 6l-12 7v90c0 8 3 16 8 22 6 6 14 9 23 9h90zm13 39l61
				63h-55l-4-1c-1-1-2-1-2-4z'/>
		</g>
		<path fill='#fff' d='M150 227l-37 37-17-18 37-36-37-36 17-18 37 37 36-37
			18 18-37 36 37 36-18 18z'/>
		<text x='346' y='172' fill='#fff' font-size='67' font-weight='400'
			font-family='Helvetica,Arial,Tahoma,Liberation Sans,sans-serif'>
			<tspan x='346' y='172'>id:${postId}</tspan>
			<tspan x='346' y='255'>metadata unavailable</tspan>
		</text>
	</svg>`;
};

const svgCircleArrow = function(rot = 0) {
	return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 72 72'>
		<path fill='#fff'
			transform='rotate(${rot|0} 36 36)'
			d='M0 36a36 36 0 1 0 72 0 36 36 0 0 0-72 0zm60 6l-8
				8-16-15-16 15-8-8 24-24z'/>
	</svg>`;
};

const svgCircleLink =
	`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 72 72'>
		<path fill='#fff'
			d='M36 0C16.118 0 0 16.118 0 36s16.118 36 36 36 36-16.118
				36-36S55.882 0 36 0zm.576 26.63h17.059c4.933 0 8.99 4.058 8.99
				8.991s-4.057 8.988-8.99 8.988H42.748a11.152 11.152 0 0 0
				4.084-5.41h6.803c2.03 0 3.58-1.548
				3.58-3.578s-1.55-3.58-3.58-3.58H36.576c-2.03 0-3.58
				1.55-3.58 3.58 0 .41.066.798.184 1.16h-5.516a8.883
				8.883 0 0 1-.078-1.16c0-4.933 4.057-8.99
				8.99-8.99zm-18.21.76h10.886a11.152 11.152 0 0 0-4.084
				5.41h-6.803c-2.03 0-3.58 1.55-3.58 3.579 0 2.03 1.55 3.58 3.58
				3.58h17.059c2.03 0 3.58-1.55 3.58-3.58
				0-.41-.066-.798-.184-1.16h5.516c.05.38.078.766.078 1.16 0
				4.933-4.057 8.99-8.99 8.99H18.365c-4.933
				0-8.99-4.057-8.99-8.99s4.057-8.988 8.99-8.988z'/>
	</svg>`;

const svgCircleRing =
	`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 72 72'>
		<path fill='#fff' d='M36 0C16.118 0 0 16.118 0 36s16.118 36 36 36
			36-16.118 36-36S55.882 0 36 0zm0 8.5A27.5 27.5 0 0 1 63.5 36 27.5
			27.5 0 0 1 36 63.5 27.5 27.5 0 0 1 8.5 36 27.5 27.5 0 0 1 36 8.5zm0
			5A22.5 22.5 0 0 0 13.5 36 22.5 22.5 0 0 0 36 58.5 22.5 22.5 0 0 0
			58.5 36 22.5 22.5 0 0 0 36 13.5z'/>
	</svg>`;

const svgCircleSpinner =
	`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 72 72'>
		<path fill='#fff' d='M36 0C16.118 0 0 16.118 0 36s16.118 36 36 36
			36-16.118 36-36S55.882 0 36 0zm0 8.5A27.5 27.5 0 0 1 63.5 36 27.5
			27.5 0 0 1 36 63.5 27.5 27.5 0 0 1 8.5 36 27.5 27.5 0 0 1 36 8.5zm0
			5A22.5 22.5 0 0 0 13.5 36 22.5 22.5 0 0 0 36 58.5 22.5 22.5 0 0 0
			58.5 36 22.5 22.5 0 0 0 36 13.5z'/>
		<path fill='#fff' opacity='.75' d='M8.5 36a27.5 27.5 0 0 0 8.066
			19.434L20.1 51.9A22.5 22.5 0 0 1 13.5 36z'/>
		<path fill='#fff' opacity='.625' d='M20.1 51.9l-3.534 3.534A27.5 27.5 0
			0 0 36 63.5v-5a22.5 22.5 0 0 1-15.9-6.6z'/>
		<path fill='#fff' opacity='.125' d='M36 8.5v5a22.5 22.5 0 0 1 15.9
			6.6l3.534-3.534A27.5 27.5 0 0 0 36 8.5z'/>
		<path fill='#fff' d='M36 8.5a27.5 27.5 0 0 0-19.434 8.066L20.1 20.1A22.5
			22.5 0 0 1 36 13.5v-5z'/>
		<path fill='#fff' opacity='.25' d='M55.434 16.566L51.9 20.1A22.5 22.5 0
			0 1 58.5 36h5a27.5 27.5 0 0 0-8.066-19.434z'/>
		<path fill='#fff' opacity='.375' d='M58.5 36a22.5 22.5 0 0 1-6.6
			15.9l3.534 3.534A27.5 27.5 0 0 0 63.5 36z'/>
		<path fill='#fff' opacity='.5' d='M51.9 51.9A22.5 22.5 0 0 1 36
			58.5v5a27.5 27.5 0 0 0 19.434-8.066z'/>
		<path fill='#fff' opacity='.875' d='M16.566 16.566A27.5 27.5 0 0 0 8.5
			36h5a22.5 22.5 0 0 1 6.6-15.9z'/>

		<!-- <animateTransform
			attributeName='transform'
			attributeType='XML'
			type='rotate'
			from='0 0 0'
			to='360 0 0'
			dur='1s'
			repeatCount='indefinite'/> -->
		<!-- svg animation is too expensive - use css animation instead -->
	</svg>`;

const svgCircleNote =
	`<svg xmlns='http://www.w3.org/2000/svg' width='72' height='72'>
		<path fill='#fff' d='M36 0A36 36 0 0 0 0 36a36 36 0 0 0 36 36 36 36 0
			0 0 36-36A36 36 0 0 0 36 0zm14.727 18.45l2.54 29.048-2.945
			3.51-29.049 2.543-2.54-29.049 2.945-3.51 29.049-2.543zM35.563
			32.876c.256-.161-6.211 4.225-12.694 1.73.737 8.421 9.125 14.663
			21.192 13.698-8.656-3.156-8.412-15.205-8.498-15.428z'/>
	</svg>`;

/*const svgCircleNote =
	`<svg xmlns='http://www.w3.org/2000/svg' width='72' height='72'>
		<path fill='#fff' d='M36 0C16.118 0 0 16.118 0 36s16.118 36 36 36
			36-16.118 36-36S55.882 0 36 0zm0 8.5A27.5 27.5 0 0 1 63.5 36 27.5
			27.5 0 0 1 36 63.5 27.5 27.5 0 0 1 8.5 36 27.5 27.5 0 0 1 36
			8.5zm14.727 9.95l-29.05 2.542-2.945 3.51 2.541 29.049 29.05-2.543
			2.945-3.51-2.541-29.049zM35.563 32.876c.086.223-.158 12.272 8.498
			15.428-12.067.965-20.455-5.277-21.192-13.698 6.483 2.495
			12.95-1.891 12.694-1.73z'/>
	</svg>`;*/

const svgCircleExpand =
	`<svg xmlns='http://www.w3.org/2000/svg' width='72' height='72'>
		<path fill='#fff' d='M35.999 0a36.187 36.187 0 0 0-5.86.488c-.337`+
			`.055-.675.105-1.011.17l-.006.002c-.565.11-1.129.232-1.69.369l-.00`+
			`3.002c-.561.137-1.121.287-1.676.451l-.004.002c-.555.165-1.106.342`+
			`-1.654.533-.192.067-.38.145-.57.215-.357.132-.716.26-1.07.403 0 0`+
			`-.002 0-.003.002-.54.219-1.076.452-1.607.699-.002 0-.004 0-.006.0`+
			`02-.531.246-1.056.507-1.576.781-.352.185-.698.385-1.045.582-.168.`+
			`096-.34.183-.506.281l-.006.004c-.51.301-1.015.615-1.512.944l-.004`+
			`.003c-.177.118-.35.245-.525.366a35.9 35.9 0 0 0-2.383 1.773l-.006`+
			`.004c-.47.383-.93.78-1.385 1.19l-.006.003a36.642 36.642 0 0 0-2.6`+
			`15 2.618l-.004.003c-.41.455-.808.917-1.191 1.387l-.004.004c-.383.`+
			`47-.751.947-1.107 1.432-.312.423-.608.855-.899 1.289-.042.063-.08`+
			`9.124-.13.187l-.005.006a35.692 35.692 0 0 0-3.146 5.918c-.047.113`+
			`-.1.225-.147.338 0 .002 0 .004-.002.006-.218.54-.423 1.085-.615 1`+
			`.633-.068.195-.126.393-.191.59-.118.356-.24.711-.346 1.07v.004a35`+
			`.908 35.908 0 0 0-.453 1.674v.004a36.032 36.032 0 0 0-.84 4.912c-`+
			`.007.068-.019.136-.025.205v.002a36.147 36.147 0 0 0-.123 1.72v.00`+
			`4a36.245 36.245 0 0 0 0 3.452v.002c.027.574.068 1.15.123 1.722.00`+
			`6.07.018.138.025.207.1.981.24 1.958.42 2.93.018.095.03.192.049.28`+
			`7v.002c.11.567.234 1.131.371 1.693v.002a35.834 35.834 0 0 0 2.305`+
			` 6.586l.002.002a35.69 35.69 0 0 0 4.736 7.56v.003a36.426 36.426 0`+
			` 0 0 8.117 7.346l.002.002c.498.329 1.003.643 1.514.945l.002.002c.`+
			`51.301 1.027.589 1.549.863a35.773 35.773 0 0 0 1.584.783s0 .002.0`+
			`02.002c.532.247 1.068.478 1.61.698.337.137.678.258 1.019.384.206.`+
			`077.41.162.617.235h.002c.549.192 1.102.37 1.658.535h.002c.556.165`+
			` 1.114.316 1.676.453h.004c.56.137 1.125.262 1.691.371h.004c.19.03`+
			`7.383.064.574.098.868.153 1.74.28 2.615.369.078.008.155.02.233.02`+
			`7h.002A36.146 36.146 0 0 0 36 72c1.29 0 2.578-.075 3.861-.213a36.`+
			`137 36.137 0 0 0 3.01-.445c.197-.038.392-.087.588-.129a35.985 35.`+
			`985 0 0 0 2.787-.695c.36-.107.717-.228 1.074-.346.557-.184 1.11-.`+
			`382 1.659-.594.187-.072.377-.137.564-.212l.006-.002c.542-.22 1.07`+
			`9-.454 1.611-.702.171-.079.338-.17.508-.252a35.66 35.66 0 0 0 2.6`+
			`25-1.396c.51-.302 1.017-.616 1.516-.945 0 0 0-.002.002-.002.497-.`+
			`329.987-.67 1.47-1.026l.006-.004a36.188 36.188 0 0 0 2.612-2.123c`+
			`.069-.061.142-.117.21-.18.002 0 .003-.002.004-.003.046-.042.09-.0`+
			`87.135-.13.407-.37.81-.75 1.203-1.144.44-.439.866-.886 1.278-1.34`+
			`1l.006-.006a36.11 36.11 0 0 0 2.3-2.823l.004-.004c.356-.484.699-.`+
			`974 1.028-1.472 0-.001 0-.003.002-.004a35.827 35.827 0 0 0 1.81-3`+
			`.063l.002-.006c.088-.167.167-.338.252-.507a35.77 35.77 0 0 0 1.22`+
			`9-2.682l.002-.004c.053-.132.098-.267.15-.4.16-.411.322-.823.467-1`+
			`.239.124-.354.235-.712.347-1.07.062-.196.132-.39.19-.588a35.97 35`+
			`.97 0 0 0 .451-1.676v-.003c.137-.562.262-1.126.371-1.692v-.004c.0`+
			`37-.19.064-.383.098-.574.153-.868.28-1.74.369-2.615.008-.078.02-.`+
			`155.027-.233v-.002a36.24 36.24 0 0 0 .123-1.72v-.004c.028-.574.04`+
			`1-1.148.041-1.723v-.004c0-.575-.013-1.15-.04-1.724v-.002a36.155 3`+
			`6.155 0 0 0-.124-1.721v-.002a36.22 36.22 0 0 0-.205-1.717v-.002c-`+
			`.082-.57-.18-1.138-.289-1.705v-.002c-.024-.123-.055-.246-.08-.37a`+
			`35.924 35.924 0 0 0-1.897-6.3 35.744 35.744 0 0 0-6.63-10.565 36.`+
			`072 36.072 0 0 0-9.992-7.771 35.746 35.746 0 0 0-4.831-2.098c-.37`+
			`2-.13-.75-.245-1.125-.363A35.944 35.944 0 0 0 41.661.455c-.164-.0`+
			`26-.326-.06-.49-.084h-.004c-.57-.082-1.14-.152-1.713-.207h-.004A3`+
			`6.226 36.226 0 0 0 37.73.04h-.004A36.205 36.205 0 0 0 35.999 0zm-`+
			`3.027 16.425h22.603l-.451 22.153-7.686-.453V24.562l-14.015-.451zM`+
			`16.876 33.422l7.685.453v13.562l14.016.451.451 7.686H16.425z'/>
	</svg>`;

const svgCircleContract =
	`<svg xmlns='http://www.w3.org/2000/svg' width='72' height='72'>
		<path fill='#fff' d='M35.999 0a36.187 36.187 0 0 0-5.86.488c-.337`+
			`.055-.675.105-1.011.17l-.006.002a36.05 36.05 0 0 0-1.69.369l-.003`+
			`.002c-.561.137-1.121.287-1.676.451l-.004.002c-.555.165-1.106.342-`+
			`1.654.533-.192.067-.38.145-.57.215-.357.132-.716.26-1.07.403 0 0-`+
			`.002 0-.003.002-.54.219-1.076.452-1.607.699-.002 0-.004 0-.006.00`+
			`2-.531.246-1.056.507-1.576.781-.352.185-.698.385-1.045.582-.168.0`+
			`96-.34.183-.506.281l-.006.004c-.51.301-1.015.615-1.512.944l-.004.`+
			`003c-.177.118-.35.245-.525.366a35.9 35.9 0 0 0-2.383 1.773l-.006.`+
			`004c-.47.383-.93.78-1.385 1.19l-.006.003a36.643 36.643 0 0 0-2.61`+
			`5 2.618l-.004.003c-.41.455-.808.917-1.191 1.387l-.004.004c-.383.4`+
			`7-.751.947-1.107 1.432-.312.423-.608.855-.899 1.289-.042.063-.089`+
			`.124-.13.187l-.005.006a35.692 35.692 0 0 0-3.146 5.918c-.047.113-`+
			`.1.225-.147.338 0 .002 0 .004-.002.006-.218.54-.423 1.085-.615 1.`+
			`633-.068.195-.126.393-.191.59-.118.356-.24.711-.346 1.07v.004a35.`+
			`908 35.908 0 0 0-.453 1.674v.004a36.032 36.032 0 0 0-.84 4.912c-.`+
			`007.068-.019.136-.025.205v.002a36.147 36.147 0 0 0-.123 1.72v.004`+
			`a36.245 36.245 0 0 0 0 3.452v.002c.027.574.068 1.15.123 1.722.006`+
			`.07.018.138.025.207.1.981.24 1.958.42 2.93.018.095.03.192.049.287`+
			`v.002c.11.567.234 1.131.371 1.693v.002a35.834 35.834 0 0 0 2.305 `+
			`6.586l.002.002a35.69 35.69 0 0 0 4.736 7.56v.003a36.426 36.426 0 `+
			`0 0 8.117 7.346l.002.002c.498.329 1.003.643 1.514.945l.002.002c.5`+
			`1.301 1.027.589 1.549.863l.002.002c.521.274 1.05.535 1.582.781l.0`+
			`02.002c.532.247 1.068.478 1.61.698.337.137.678.258 1.019.384.206.`+
			`077.41.162.617.235h.002c.549.192 1.102.37 1.658.535h.002c.556.165`+
			` 1.114.316 1.676.453h.004c.56.137 1.125.262 1.691.371h.004c.19.03`+
			`7.383.064.574.098.868.153 1.74.28 2.615.369.078.008.155.02.233.02`+
			`7h.002A36.146 36.146 0 0 0 36 72c1.29 0 2.578-.075 3.861-.213a36.`+
			`137 36.137 0 0 0 3.01-.445c.197-.038.392-.087.588-.129a35.985 35.`+
			`985 0 0 0 2.787-.695c.36-.107.717-.228 1.074-.346.557-.184 1.11-.`+
			`382 1.659-.594.187-.072.377-.137.564-.212l.006-.002c.542-.22 1.07`+
			`9-.454 1.611-.702.171-.079.338-.17.508-.252a35.66 35.66 0 0 0 2.6`+
			`25-1.396c.51-.302 1.017-.616 1.516-.945l.002-.002c.497-.329.987-.`+
			`67 1.47-1.026l.006-.004a36.188 36.188 0 0 0 2.612-2.123c.069-.061`+
			`.142-.117.21-.18.002 0 .003-.002.004-.003.046-.042.09-.087.135-.1`+
			`3.407-.37.81-.75 1.203-1.144.44-.439.866-.886 1.278-1.341l.006-.0`+
			`06a36.11 36.11 0 0 0 2.3-2.823l.004-.004c.356-.484.699-.974 1.028`+
			`-1.472 0-.001 0-.003.002-.004a35.827 35.827 0 0 0 1.81-3.063l.002`+
			`-.006c.088-.167.167-.338.252-.507a35.77 35.77 0 0 0 1.229-2.682l.`+
			`002-.004c.053-.132.098-.267.15-.4.16-.411.322-.823.467-1.239.124-`+
			`.354.235-.712.347-1.07.062-.196.132-.39.19-.588a35.97 35.97 0 0 0`+
			` .451-1.676v-.003c.137-.562.262-1.126.371-1.692v-.004c.037-.19.06`+
			`4-.383.098-.574.153-.868.28-1.74.369-2.615.008-.078.02-.155.027-.`+
			`233v-.002a36.24 36.24 0 0 0 .123-1.72v-.004c.028-.574.041-1.148.0`+
			`41-1.723v-.004c0-.575-.013-1.15-.04-1.725v-.002a36.155 36.155 0 0`+
			` 0-.124-1.72v-.003a36.223 36.223 0 0 0-.205-1.716v-.002c-.082-.57`+
			`-.18-1.139-.289-1.706v-.002c-.024-.123-.055-.245-.08-.369a35.933 `+
			`35.933 0 0 0-1.896-6.3 35.899 35.899 0 0 0-4.325-7.74 36.14 36.14`+
			` 0 0 0-3.584-4.168 36.072 36.072 0 0 0-8.715-6.428 35.746 35.746 `+
			`0 0 0-4.83-2.098c-.372-.13-.75-.245-1.125-.363A35.944 35.944 0 0 `+
			`0 41.661.455c-.164-.026-.326-.06-.49-.084h-.004c-.57-.082-1.14-.1`+
			`52-1.713-.207h-.004A36.226 36.226 0 0 0 37.73.04h-.004A36.205 36.`+
			`205 0 0 0 35.999 0zm2.877 11.422l7.685.453v13.562l14.016.451.451 `+
			`7.686H38.425zM10.972 38.425h22.603l-.451 22.153-7.686-.453V46.562`+
			`l-14.015-.451z'/>
	</svg>`;

/* -------------------------------------------------------------------------- */

if (runtime === `browser`) {
	userscriptEntrypoint(document);

} else if (runtime === `nodejs`) {
	nodejsEntrypoint(...process.argv.slice(2))
		.catch(err => {
			logError(err);
			process.exit(1);
		});

} else {
	debugger;
	throw new Error(`unrecognised runtime environment`);};

/* -------------------------------------------------------------------------- */
