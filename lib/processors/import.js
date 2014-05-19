'use strict';

var fs      = require('fs'),
    path    = require('path'),
    postcss = require('postcss');

function Importer (dirname) {
    Importer.prototype.dirname = path.resolve(dirname);
}
Importer.prototype.processor = function (css) {

    // process CSS
    process(css);

    return css;

};
function process (style) {

    // create a new CSS
    var newCSS = postcss.root();

    // for each rule
    style.each(function (rule) {

        // get the filename
        var file = getFileIfAtImport(rule);

        // if it's an @import OK
        if (file) {

            // store dirname
            var dirname = path.dirname(file);

            // get the CSS from @import-ed file
            var processed = getCSSFromImportedFile(file);
            // resolve all @import url
            processed.eachAtRule(function (rule) {
                if (rule.name === 'import') {
                    var file = getFilename(rule.params);
                    // if @import don't contain media
                    if (file !== 'false') {
                        // resolve the path
                        rule.params = path.resolve(dirname, file);
                    }
                }
            });

            // concat rules with new CSS
            newCSS.rules = newCSS.rules.concat( processed.rules );

        } else {

            // this is not an @import, so append the rule to the new CSS
            newCSS.append(rule);

        }

    });

    // copy all the rules
    style.rules = newCSS.rules;

    // if the file still have @import: process style
    if (hasImports(style)) {
        process(style);
    }

}
function getCSSFromImportedFile (filename) {

    var data = fs.readFileSync(filename, 'utf8');
    var style = postcss.parse(data);

    return style;

}
function getFileIfAtImport (rule) {

    if (rule.type === 'atrule' && rule.name === 'import') {
        var file = getFilename(rule.params);
        // if @import don't contain media
        if (file !== 'false') {
            // resolve the path
            return path.resolve(Importer.prototype.dirname, file);
        } else {
            return false;
        }
    }

}
function hasImports (style) {

    var yes = false;

    style.eachAtRule(function (rule) {
        yes = getFileIfAtImport(rule);
    });

    return yes;

}
function getFilename (params) {

    // search for the url
    var RE_URL = /^(url\(["\']?|["\']{1})(\S[^"\'\)]+)["\']?[\)]?(.*)/;
    // get the filename
    var file = params.replace(RE_URL, function(_, hash, url, media) {
        // if a media is specified OR if it's an URL: ignore @import
        if (media !== '' || /^[\s"\']*http/.test(url)) {
            return false;
        }
        return url;
    });
    // return file without "" or ''
    return file.replace(/^("|\')/, '').replace(/("|\')$/, '');

}

var importer = function(dirname) {
    return new Importer(dirname);
};
module.exports = importer;