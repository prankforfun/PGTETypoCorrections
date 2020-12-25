# Typo Extension for Practical Guide to Evil

## Installation
  - Install the Tampermonkey extension at https://www.tampermonkey.net/ for your browser. You can also use other extensions such as Greasemonkey if you wish.
  - You should see a little Tampermonkey extension icon in the corner of your browser window, where all the extensions are. Click on it, and open the Tampermonkey dashboard.
  - Click "utilities" and focus on enter the following URL in the "install from URL" field: https://raw.githubusercontent.com/prankforfun/PGTETypoCorrections/main/pgte-typos.js
  - Click install. You should be done! Navitage to https://practicalguidetoevil.wordpress.com/, and click on a chapter to try it out.

To try it out once without installing, just copy the contents of the javascript file to the clipboard; then, go to any PGTE chapter page, press ctrl+shift+j (or other key combination such as F12) to open the javascript console, and paste the script into the console and hit enter. Then, you need to trigger a load event for the fixes to take place, so type `dispatchEvent(new Event('load'));` and hit enter. This should print some things to the console, and fix the typos on the page.

## What does it do

This extension is to make the reading of the webserial *A Practical Guide to Evil*, by ErraticErrata, easier, by automatically fixing typos that are recognized in the comments.

The extension looks for comments of this form:

    Typos [standard]:
    <typo>
    <typo>
    ...
    
Note that the header (`Typos [standard]:`) must match **exactly.** Blank lines are ignored.
The format of each `<typo>` is as follows: you can either directly substitute a phrase for another e.g.

    this is a type -> this is a typo
    
Alternatively, you can use the format `{context} typo -> fixed`. For example, in this case, it would look like

    {this is a type} type -> typo
    
This format should just be seen as a shortcut for writing the original, long form.

The extension then looks at the text in the `.entry-content` div; it goes through all the text nodes, and when it encounters a typo, it performs the appropriate replacement. Lines after the header that start with an open parenthesis (`(`) are ignored (considered "comments").

## Making your own corrections
If you see any typos, feel free to leave your own comment in the prescribed format. This extension automatically adds a little box to help you with just that (called the "typo pane"). Initially, you can see two buttons (the "Load" button and the "Next" button). First, enter the header `Typos [standard]:` and a list of typos into the reply box (where it says "Enter your comment here"). Then, press the "Load" button. If your comment is formatted correctly, it will load the first typo on the list, highlighting what it thinks it should be replacing, and showing you how the paragraph will look after the fix is enacted. Press "Next" to go through all the typos in your list. As you press "Next," the text itself will be changed as well. Therefore, once you go through your entire list, you should be able to re-read the chapter and not spot any typos. Then, you can submit the comment.

## Subtleties
Make sure you review your typos before submitting them. For example, we don't check for word boundaries, so if you write
    
    {I ate a apple} a -> an
    
this will actually change `I ate a apple` to `I ante a apple` -- not quite what you wanted. Instead, you should write

    {I ate a apple} a apple -> an apple
    
Furthermore, spacing around the typos is trimmed, so this is equivalent to

    {I ate a apple}  a apple  ->  an apple   

In general, err on the side of preserving the original text; it is better to not fix a typo than to fix it incorrectly, in my opinion.

Make sure that you format your typo correction in such a way that it can't be applied twice. If a particular context is found zero or multiple times, a warning is logged to the console but the line is skipped. However, if you have the piece of text "I don't know what happen." and fix it with

    {I don't know what happen} happen -> happened
    
Then, if someone else fixes the typo before you submit the comment, or if EE later fixes the comment in the chapter itself, this will actually create a typo (the sentence will read "I don't know what happeneded"). Therefore, use instead

    {I don't know what happen.} hapen -> happened
    
The key difference is that the presence of the period makes it so that if the typo is already fixed, the context simply won't be found, and the line will be skipped.

The program only searches through text nodes of the same formatting so that it doesn't lose any formatting. For example, suppose the original sentence was "I couldn't believe Archer was better than me at *abstract mathmatics* of all things," the following correction *wouldn't* work:

    {at abstract mathmatics} mathmatics -> mathematics
    
This is because "at" is not italicized, whereas "abstract mathmatics" is. The program wouldn't know which words to italicize in the replacement. Therefore, instead, simply do

    {abstract mathmatics} mathmatics -> mathematics
    
Finally, keep in mind that the text really looks for *exact* matches. Capitalization has to be correct for it to match, for example. This is particularly annoying when there are special characters that aren't in typical keyboards in the text, such as a long dash ("—"), open and close smart quotes, etc. The extension automatically tries to fix the quotes issue by changing ' "' (i.e. a space followed by a double quote) to an open quote, changing '" ' to '” ', and changing "'" (single quotes) to "’" (close smart single quote). This handles the majority of the cases, but if your case is different, just copy and paste the special character from the text.

Moreover, in some (very rare) cases, I have found that there is a non line breaking space `&nbsp;` instead of a usual space in some parts of the text. These spaces look identical to an ordinary space, but are actually different. If it seems like it can't find a piece of text that is clearly there, the best option is to go to inspect element, to see if there are any funny characters in the piece of text you are editing.


## Spam, XSS attacks

One major security issue is XSS attacks. For example, what if someone writes

    "I'm going to get blamed for this, aren't I?" Catherine said. -> <script>alert("XSS!")</script>
    
A naive implementation of "typo fixing" would cause this to execute the (potentially malicious) code, which is clearly very dangerous. I have been careful to only change the contents of text nodes and only set text (rather than raw HTML) in the script, so it should be entirely resistant to these kinds of attacks. Still, you can never be too sure, so use at your own risk.

Another issue is the issue of spam. What if someone comments

    "I'm going to get blamed for this, aren't I?" Catherine said. -> Butts lol lol
    
The easiest way to counteract this spam is to either just disable the extension for that page, or for someone else to comment a reverse correction i.e.

    Butts lol lol -> "I'm going to get blamed for this, aren't I?" Catherine said.

The extension ensures that the comments are sorted by time of posting before executing the typo corrections. Hence, a comment posted later will be able to fix or change what was posted by an earlier comment. This is also useful for typo "fixes" that were incorrect, introduced a different typo, etc.

If a particular person is particularly egregious, you should be able to post a comment in the following format:

    Typos [standard] ignore:
    <username of spammer>
    
This will cause the program to ignore any comments made by that username.
