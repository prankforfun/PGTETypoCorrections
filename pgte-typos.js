// ==UserScript==
// @name         PGTE Typo Fixer
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Automatically fix typos in A Practical Guide To Evil by reading comments that are formatted correctly
// @author       prank
// @match        https://practicalguidetoevil.wordpress.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';


    /*
    Advance to the next typo in the typo pane
    */
    var goNextTypo = function() {
        function makeHighlight(text) { let span = document.createElement('span'); span.style.backgroundColor = 'yellow'; span.append(document.createTextNode(text)); return span; }
        let pane = document.querySelector("#typoPane");

        let beforeTypo = pane.querySelector("#beforeTypo");
        let afterTypo = pane.querySelector("#afterTypo");
        beforeTypo.innerHTML = '';
        afterTypo.innerHTML = '';

        let typos = JSON.parse(pane.dataset.typoTextParsed);
        if (typos.length === 0) return;
        let typo = typos[0];
        pane.dataset.typoTextParsed = JSON.stringify(typos.slice(1));
        pane.dataset.currentTypo = JSON.stringify(typo);
        let p = getParagraphOfTypo(typo);
        if (!p) { beforeTypo.append(makeHighlight("Could not find/multiple instances of context " + typo.ctx)); return; }
        let ind = p.textContent.indexOf(typo.ctx);
        if (p.textContent.indexOf(typo.ctx, ind+1) >= 0) { beforeTypo.append(makeHighlight("Multiple instances of " + typo.ctx)); return; }

        // In the beforeTypo section, add the original text, with typo.ctx highlighted
        // In the afterTypo section, add the fixed text, again with the change highlighted
        beforeTypo.append(document.createTextNode(p.textContent.slice(0, ind)));
        beforeTypo.append(makeHighlight(typo.ctx));
        beforeTypo.append(document.createTextNode(p.textContent.slice(ind+typo.ctx.length)));

        afterTypo.append(document.createTextNode(p.textContent.slice(0, ind)));
        afterTypo.append(makeHighlight(typo.ctx.replace(typo.typo, typo.fixed)));
        afterTypo.append(document.createTextNode(p.textContent.slice(ind+typo.ctx.length)));

    };

    var addTypoPane = function() {
        var div = document.createElement('div');
        div.id = "typoPane";
        div.innerHTML = `<button id="loadTypoText">Load</button>
                         <button id="nextTypo">Next</button>
                         <div id="beforeTypo">Text (before)</div>
                         <hr>
                         <div id="afterTypo">Text (after)</div>`;
        // Add the typo pane at the beginning of the "Leave a Reply" section
        document.querySelector("#respond").prepend(div);
        // Save the original content of the post, so that every time "load" is clicked
        // we can reset to the original state
        var originalSavedHTML = document.querySelector(".entry-content").innerHTML;
        div.querySelector("#loadTypoText").addEventListener("click", function() {
            // Reset the HTML
            document.querySelector(".entry-content").innerHTML = originalSavedHTML;
            let txt = document.querySelector("#comment").value;
            // Load whatever is in the text box
            let typos = parseTypoText(txt);
            if (!typos) return;
            div.dataset.typoTextParsed = JSON.stringify(typos);
            div.dataset.currentTypo = '';
            setTimeout(goNextTypo, 10);
        });
        div.querySelector("#nextTypo").addEventListener("click", function() {
            let pane = document.querySelector("#typoPane");
            // currentTypo is the typo that was previously highlighted and will now disappear, or the empty string if this is the first typo
            if (pane.dataset.currentTypo) fixTypoText(JSON.parse(pane.dataset.currentTypo));
            setTimeout(goNextTypo, 10);
        });
    };


    var getParagraphOfTypo = function(typo) {
        let ps = [];
        getTextElements().forEach(p => {
            if (p.textContent.indexOf(typo.ctx) >= 0) ps.push(p);
        });
        if (ps.length !== 1) return false;
        let p = ps[0];
        return p;
    };


    var fixTypoText = function(typo) {
        let p = getParagraphOfTypo(typo);
        if (!p) { console.warn(typo.ctx, "has multiple or no matches"); return false; }
        let idx = p.textContent.indexOf(typo.ctx);
        if (p.textContent.indexOf(typo.ctx, idx+1) >= 0) { console.warn(typo.ctx, "has multiple matches in", p); return false; }
        let fixedCtx = typo.ctx.replace(typo.typo, typo.fixed);
        console.log("Changing", p.textContent, "to", p.textContent.replace(typo.ctx, fixedCtx));
        p.textContent = p.textContent.replace(typo.ctx, fixedCtx);
        return true;
    };

    var parseTypoText = function(txt) {
        let lines = txt.split("\n").filter(line => line.length > 0 && !line.startsWith("(")) // remove empty lines and comment lines;
        if (lines[0] !== "Typos [standard]:") return false;
        lines = lines.slice(1).map(line => line.replace(/\'/g, "’").replace(/(?<=\s)\"/g, '“').replace(/\"(?=\s)/g, '”')); // handle quotes
        let re = /^({.+})?(.+)\->(.+)$/;
        let parsedLines = lines
        .map(line => line.match(re) || !!console.warn("Could not parse line", line, "(Skipping this)"))
        .filter(m => m)
        .map(m => ({ ctx: m[1] ? m[1].slice(1, -1) : m[2].trim(), typo: m[2].trim(), fixed: m[3].trim() }));
        return parsedLines;
    };


    function getTextElements() {
        var walker = document.createTreeWalker(
            document.querySelector(".entry-content"),
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        var node;
        var textNodes = [];

        while(node = walker.nextNode()) {
            textNodes.push(node);
        }
        return textNodes;
    };

    var getAllCommentsText = function(doc) {
        doc = doc || document;
        let comments = Array.from(doc.querySelectorAll(".comment-body"));
        let commentsContent = comments.map(c => Array.from(c.querySelectorAll(".comment-content p:not(.comment-likes)")).map(p => p.innerText).join("\n"));
        let commentsTime = comments.map(c => new Date(c.querySelector("time").dateTime));
        let commentsAuthor = comments.map(c => c.querySelector(".comment-meta .comment-author").innerText);
        return commentsContent.map((c, i) => ({comment: c, time: commentsTime[i], author: commentsAuthor[i]}));
    };

    var getAllCommentsAllDocs = function() {
        let comments = getAllCommentsText();
        let as = Array.from(document.querySelectorAll(".nav-links a"));
        as = as.filter(a => /(?:newer|older) comments/i.test(a.innerText));
        if (as.length === 0) return Promise.resolve(comments);
        let a = as[0];
        return fetch(a.href).then(response => response.text())
            .then(response => getAllCommentsText(new DOMParser().parseFromString(response, 'text/html')))
            .then(otherComments => comments.concat(otherComments));
    };

    var parseCommentDesignatingSpam = function(comment) {
        let lines = comment.split("\n").filter(line => line.length > 0);
        if (lines[0] !== "Typos [standard] ignore:") return false;
        return lines[1];
    }



    window.addEventListener("load", function() {
        getAllCommentsAllDocs()
        // Sort comments by time of posting so that earlier comments are executed first
        .then(comments => comments.sort((x, y) => x.time.getTime() - y.time.getTime()))
        .then(comments => {
            let spamAuthors = {};
            for (let c of comments) {
                let toIgnore = parseCommentDesignatingSpam(c.comment);
                if (toIgnore) spamAuthors[toIgnore] = true;
            }
            console.log("Ignoring comments from", spamAuthors);
            let tt = comments.map(c => !spamAuthors[c.author] && parseTypoText(c.comment)).filter(x => x);
            console.log("Typo comments", tt);
            for (let t of tt) {
                for (let typo of t) {
                    fixTypoText(typo);
                }
            }
        });
        setTimeout(addTypoPane, 10);
    });


})();

