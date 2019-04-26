[![Build Status](https://travis-ci.com/bipface/galkontinuum.svg?branch=master)](https://travis-ci.com/bipface/galkontinuum)
# Galkontinuum
Galkontinuum is a [userscript][wiki userscript] which enables slideshow-style
browsing of search results on the Booru family of sites.

It targets galleries running Gelbooru 0.2.x, Danbooru 2.x, Danbooru 1.x and
compatible forks such as e621 and Moebooru.

## Installation

### Requirements

- Firefox 56 or newer.
- Chrome 60 or newer.

Support for other browsers may be considered if requested.

### Userscript manager

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

- Markup is not supported in note text.

- On Gelbooru-based sites, posts added within the last few minutes may fail to
load due to the search database being out of sync with the main database.

- On Danbooru-based sites, it is suspected that only up to 1000 notes will be
shown on any single post. It is unknown whether there are any posts with over
1000 notes.

- Posts with an ID less than zero or greater than 2147483647 will not be
recognised. It is unknown whether there are any boorus with IDs outside this
range.

[dist galk]: https://github.com/bipface/galkontinuum/raw/master/dist/galkontinuum.user.js
[dist manif]: https://github.com/bipface/galkontinuum/raw/master/dist/manifest.json
[wiki userscript]: https://en.wikipedia.org/wiki/Userscript
[greasemonkey]: https://www.greasespot.net/
[tampermonkey]: https://tampermonkey.net/
[chrome load unpacked]: https://i.imgur.com/RDu11ts.png
[chrome select folder]: https://i.imgur.com/mvJnMHQ.png
