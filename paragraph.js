/*jshint esversion: 6 */

export default class Paragraph {
    constructor(paragraph_text) {
        paragraph_text = this.removeCurlyQoutes(paragraph_text)
         this.wordArray = paragraph_text.split(" ");
         this.currentWordIndex = 0;
         let totalCharCount = [];
         this.wordArray = this.wordArray.map((val,i,array) => {
             return (i===array.length-1) ? val : val + " ";
            });
         this.wordArray.forEach(function (str, index, array) {
             let previousCount = (index === 0) ? 0 : totalCharCount[index - 1];
             totalCharCount.push(previousCount + str.length);
        });
        this.totalCharCountArray = totalCharCount; 
    }

    removeCurlyQoutes(str) {
        var newstr = str.replace(/‘|’|“|”/g, function (char) {
            if(!char.localeCompare('’') | !char.localeCompare('‘')| !char.localeCompare('’') ) {
                return "'"
            }
            else {
                return '"'
            }
        })
        return newstr
    }

    getTotalCharCountAtIndex(index) {
        console.log("requested for: " + index);
        return index < 0 ? 0 : this.totalCharCountArray[index];
    }
    getTotalCharCount() {
        return this.getTotalCharCountAtIndex(this.wordArray.length-1);
    }
    getArray() {
        return this.wordArray;
    }
    getCurrentIndex() {
        return this.currentWordIndex;
    }
    getCurrentWord() {
        return this.wordArray[this.currentWordIndex];
    }
    hasWords() {
        return this.getCurrentIndex() !== -1;
    }
    updateCurrentWordIndex() {
        let hasWords = this.wordArray.length -1 > this.currentWordIndex;
        this.currentWordIndex = hasWords ? this.currentWordIndex + 1 : -1
    }
}