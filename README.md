[![Build Status](https://travis-ci.com/bipface/galkontinuum.svg?branch=master)](https://travis-ci.com/bipface/galkontinuum)
# Galkontinuum
Galkontinuum is a [userscript][wiki userscript] which enables slideshow-style
browsing of search results on the Booru family of sites.

It targets galleries running Gelbooru 0.2.x, Danbooru 2.x, Danbooru 1.x and
compatible forks such as e621 and Moebooru.

Check [dist/manifest.json][dist manif] for the current list of supported sites.

## Overview

### Thumbnail Overlay

Each post's thumbnail element will now have two buttons placed over it as shown
below. The upper button is the usual link to the post's page. The lower button
loads this post in the *media panel* (described in the next section), without
leaving the current page.

![Thumbnail overlay][thumb overlay anim]

### Media Panel

The media panel appears below the thumbnail list and provides controls to
navigate through the sequence of results for the current search.

Navigation is across the entire result set — not limited to the current page.

#### Toolbar Controls

![Media panel][media panel numbered]

1. Toggle notes overlay
2. Previous post
3. Toggle scale mode (fit-to-screen / full-size)
4. Next post
5. Close media panel and return to thumbnail
6. Unused
7. Unused
8. Link to post page
9. Unused
10. Toggle help/about panel

#### Overlay Controls

![Media overlay][media overlay numbered]

1. Previous post
2. Focus content (only appears over videos)
3. Next post
4. Release focus

When content is focused, hotkeys are disabled and overlay controls are hidden.

### Notes Overlay

Notes appear as a set of transparent rectangles over the media.
Hovering or tapping on them will reveal the caption.

Note areas scale proportionally | Caption tooltips stick to bottom edge
--- | ---
![Scaling notes][notes scaley anim] | ![Sticky captions][notes sticky captions anim]

### Hotkeys

Key | Action
:---: | ---
`⇦` | Previous post
`⇨` | Next post
`esc` | Release focus / close media panel

## Installation

### Requirements

- Firefox 56 or newer.
- Chrome 60 or newer.

Support for other browsers may be considered if requested.

### Userscript Manager

1. Install a userscript manager such as [Greasemonkey][greasemonkey] or
[Tampermonkey][tampermonkey].

2. Visit [dist/galkontinuum.user.js][dist galk].
You should be presented with an installation prompt.

### Chrome - standalone extension (Windows)

Be aware that the script will not update automatically when installed this way.

1. Download the files [dist/galkontinuum.user.js][dist galk] and
[dist/manifest.json][dist manif] into a new directory.

2. Visit `chrome://extensions`.

3. Enable the **Developer mode** option and choose **Load unpacked**.

![Load unpacked][chrome load unpacked]

4. Select the directory containing the downloaded files.

![Select Folder][chrome select folder]

## Limitations

- Navigating through results is only possible if they are ordered by ID
(ascending or descending). Note that on Moebooru-based sites, the default
order is by timestamp, not by ID — you can enable navigation by appending
`order:id_desc` to your search terms.

- On Gelbooru-based sites, posts added within the last few minutes may fail to
load due to the search database being out of sync with the main database.

- On Danbooru-based sites, [restricted posts][danbooru wiki censored tags]
might not be excluded when navigating through results, despite being hidden in
the thumbnail list on the page. These will most likely fail to load.
Working-around this issue is non-trival due to inadequacies in the
`/post/index` API.

- On Danbooru-based sites, navigation may be hindered or impossible when the
maximum number of search terms is used.
For example, searches on e621 containing more than 6 terms will result in an
error message stating "You can only search up to 6 tags at once". Therefore,
when 6 search terms are used, navigation in one or both directions may fail due
to inadequacies in the `/post/index` API requiring an additional tags to be
inserted.

- Markup is not supported in note text.

- On Danbooru-based sites, a maximum of 1000 notes will be shown on any single
post. Currently the only post known to have over 1000 notes is
[#951241][danbooru post 1k notes] on Danbooru.

- Posts with an ID less than zero or greater than 2147483647 will not be
recognised. It is unknown whether there are any boorus with IDs outside this
range.

[dist galk]: https://github.com/bipface/galkontinuum/raw/master/dist/galkontinuum.user.js
[dist manif]: https://github.com/bipface/galkontinuum/raw/master/dist/manifest.json

[wiki userscript]: https://en.wikipedia.org/wiki/Userscript
[greasemonkey]: https://www.greasespot.net/
[tampermonkey]: https://tampermonkey.net/
[danbooru wiki censored tags]: https://danbooru.donmai.us/wiki_pages/84990
[danbooru post 1k notes]: https://danbooru.donmai.us/posts/951241

[thumb overlay anim]: https://i.imgur.com/ueGF43J.gif
[notes sticky captions anim]: http://a.webpurr.com/EPLM.webp
[notes scaley anim]: http://b.webpurr.com/MMla.webp
[media panel numbered]: https://i.imgur.com/MtdHz9U.gif
[media overlay numbered]: https://i.imgur.com/0nxqIGF.png
[chrome load unpacked]: https://i.imgur.com/RDu11ts.png
[chrome select folder]: https://i.imgur.com/mvJnMHQ.png
