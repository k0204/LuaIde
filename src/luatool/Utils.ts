
import { LuaParse } from './LuaParse'
import { LuaFiledCompletionInfo } from "./provider/LuaFiledCompletionInfo"
import { LuaInfoManager } from './LuaInfoManager'
import { LuaParseTool } from './LuaParseTool'
import cp = require('child_process');
import vscode = require('vscode');
var fs = require('fs');
import { LuaInfo, TokenInfo, TokenTypes, LuaComment, LuaRange, LuaErrorEnum, LuaError, LuaInfoType } from './TokenInfo';
import { ExtensionManager } from "./ex/ExtensionManager";
export function CLog(message?: any, ...optionalParams: any[]) {
    var i = 1;
    // console.log(message, ...optionalParams);
}







/**
 * 判断是否是空格
 *  */
export function isWhiteSpace(charCode): boolean {
    return 9 === charCode || 32 === charCode || 0xB === charCode || 0xC === charCode;
}
/**
 * 判断是否换行
 *  */
export function isLineTerminator(charCode): boolean {
    return 10 === charCode || 13 === charCode;
}
export function isIdentifierPart(charCode): boolean {
    return (charCode >= 65 && charCode <= 90) || (charCode >= 97 && charCode <= 122) || 95 === charCode || (charCode >= 48 && charCode <= 57);

}


export function getTokens(document: vscode.TextDocument, position: vscode.Position, lpt?: LuaParseTool): Array<TokenInfo> {


    var start: vscode.Position = new vscode.Position(0, 0)
    if (lpt == null) {
        var lp: LuaParse = LuaParse.lp;
        lpt = LuaParse.lp.lpt;
    }

    var tokens: Array<TokenInfo> = new Array<TokenInfo>();
    if (position == null) {
        lpt.Reset(document.getText())
    } else {
        lpt.Reset(document.getText(new vscode.Range(start, position)))
    }

    while (true) {
        CLog();
        var token: TokenInfo = lpt.lex();
        if (token.error != null) {
            return;
        }
        if (token.type == TokenTypes.EOF) {
            break;
        }
        token.index = tokens.length;
        tokens.push(token);
    }
    return tokens;
}


export function getComments(comments: Array<LuaComment>): string {
    if (comments == null) return "";
    var commentStr: string = "";
    if (comments.length == 1) {
        return comments[0].content;
    }

    for (var i: number = 0; i < comments.length; i++) {
        var comment = comments[i].content
        var index = comment.trim().indexOf("==");
        if (index == 0) { continue }
        commentStr = commentStr + comment;

    }
    return commentStr;
}
export function getDescComment(comment: string) {
    var commentStr: string = ""
    var commentIndex: number = comment.indexOf("@desc")
    if (commentIndex > -1) {
        commentStr = comment.substring(commentIndex + 5);
        commentStr = trimCommentStr(commentStr)
        
    } else  {
        if (comment.indexOf("@") == 0) {
            commentStr = ""
        } else {
            commentStr = comment;
        }

    }
    return commentStr
}

export function getFirstComments(comments: Array<LuaComment>): string {
    if (comments == null) return "";
    var commentStr: string = null;
    if (comments.length == 1) {
        return getDescComment(comments[0].content);
    }

    for (var i: number = 0; i < comments.length; i++) {
        var comment = comments[i].content
        var index = comment.trim().indexOf("==");
        if (index == 0) { continue }
        commentStr = getDescComment(comments[i].content)
        if (commentStr != "") {
            break
        }
    }
    return commentStr;
}
export function trimCommentStr(commentStr: string): string {
    commentStr = commentStr.trim()
    if (commentStr.indexOf(":") == 0) {
        return commentStr.substring(1)
    } else {
        return commentStr
    }
}

/**
 * 忽略end
 */
export function ignoreEnd(index: number, tokens: Array<TokenInfo>) {
    var lp: LuaParse = LuaParse.lp;
    var endCount: number = 1;
    while (index >= 0) {
        var token: TokenInfo = tokens[index]
        index--;
        if (lp.consume('do', token, TokenTypes.Keyword) ||
            lp.consume('then', token, TokenTypes.Keyword) ||
            lp.consume('function', token, TokenTypes.Keyword)
        ) {
            endCount--;
            if (endCount == 0) {
                return index;
            }

        } else if (lp.consume('end', token, TokenTypes.Keyword)) {
            endCount++;
        }
    }
    return index

}


// export function getCurrentFunctionName(tokens: Array<TokenInfo>): Array<string> {
//     var lp: LuaParse = LuaParse.lp;
//     //检查end
//     var maxLine = tokens.length
//     var index = tokens.length - 1
//     var funNames: Array<string> = new Array<string>();
//     var endCount = 0;
//     var lastEndCount = 0;
//     var isBreak: boolean = false
//     while (index >= 0) {
//         if (isBreak) break
//         var token: TokenInfo = tokens[index]
//         if (lp.consume('end', token, TokenTypes.Keyword)) {
//             index--;
//             index = ignoreEnd(index, tokens)
//         }
//         else if (lp.consume("function", token, TokenTypes.Keyword)) {

//             var starIndex = 0;
//             var endIndex = 0;
//             //获得参数列表
//             var nextIndex = index + 1
//             //往下找 <maxLine 表示参数列表
//             while (nextIndex < maxLine) {
//                 var nextToken: TokenInfo = tokens[nextIndex]
//                 if (lp.consume('(', nextToken, TokenTypes.Punctuator)) {
//                     //先确定有参数并且不是在编写参数
//                     starIndex = nextIndex;
//                 }
//                 if (lp.consume(')', nextToken, TokenTypes.Punctuator)) {
//                     //先确定有参数并且不是在编写参数
//                     endIndex = nextIndex;
//                     break;
//                 }
//                 nextIndex++;
//             }
//             var isArgFun: boolean = false

//             if (starIndex - index == 1) {
//                 isArgFun = true
//             }
//             var funName: string = "";
//             if (starIndex <= endIndex && starIndex != 0) {

//                 if (isArgFun) {

//                     funName = "TempFun_" + token.line + "_" + token.lineStart
//                     funNames.push(funName);
//                     // console.log(funName)
//                 } else {

//                     var findex: number = index + 1;
//                     //找到方法名
//                     var functionNameToken: TokenInfo = tokens[findex];
//                     funName = funName + functionNameToken.value;
//                     while (true) {
//                         findex++;

//                         var nextToken: TokenInfo = tokens[findex]
//                         if (
//                             lp.consume('.', nextToken, TokenTypes.Punctuator) ||
//                             lp.consume(':', nextToken, TokenTypes.Punctuator)
//                         ) {
//                             findex++;
//                             funName += nextToken.value;
//                             functionNameToken = tokens[findex];
//                             funName = funName + functionNameToken.value;
//                             isBreak = true
//                         }
//                         if (findex == starIndex) {

//                             break;
//                         }
//                     }
//                     //   console.log(funName)
//                     funNames.push(funName);
//                     //找出参数列表
//                 }

//             }
//         }
//         index--;
//     }
//     // console.log("==================")
//     // console.log(funNames)
//     var newFunNames: Array<string> = new Array<string>();
//     for (var i = 0; i < funNames.length; i++) {
//         var fn = "";
//         for (var j = funNames.length - 1; j > i; j--) {
//             fn += funNames[j] + "->";
//         }
//         fn += funNames[i]
//         newFunNames.push(fn)
//     }


//     return newFunNames;
// }

/**
 * 获取方法名 采用倒叙 获取一个或者多个方法 直到遇到xxx:fun  或者 xxx.fun
 * @param tokens 
 */
export function getCurrentFunctionName(tokens: Array<TokenInfo>): Array<string> {
    var lp: LuaParse = LuaParse.lp;
    var funNames: Array<string> = new Array<string>();
    var index = tokens.length - 1
    while (index >= 0) {
        var token: TokenInfo = tokens[index]
        index--
        if (token.type == TokenTypes.Keyword && token.value == "function") {
            var nextIndex = token.index + 1
            if (nextIndex < tokens.length) {
                var nextToken: TokenInfo = tokens[nextIndex]
                var funName = ""
                if (nextToken.type == TokenTypes.Punctuator && nextToken.value == "(") {
                    funName = "TempFun_" + token.line + "_" + token.lineStart
                } else {
                    funName = this.getFunName(tokens, nextIndex)
                }
                if(funName != null){

                    funNames.push(funName)
                if (funName.indexOf(".") > -1 || funName.indexOf(":") > -1) {
                    break
                }
            }else
            {
                return []
            }
                

            } else {
                return []
            }


        } else if (lp.consume('end', token, TokenTypes.Keyword)) {
            index = ignoreEnd(index, tokens)
        }


    }
    var newFunNames: Array<string> = new Array<string>();
    for (var i = 0; i < funNames.length; i++) {
        var fn = "";
        for (var j = funNames.length - 1; j > i; j--) {
            fn += funNames[j] + "->";
        }
        fn += funNames[i]
        newFunNames.push(fn)
    }
    return newFunNames
}

export function getFunName(tokens: Array<TokenInfo>, index: number): string {
    var length = tokens.length - 1
    var funName: string = ""
    while (index < length) {

        var token: TokenInfo = tokens[index]
        if (token.type == TokenTypes.Punctuator && token.value == "(") {
            return funName;
        } else {
            funName += token.value
        }
        index++;
    }
    return funName;
}


export function getSelfToModuleName(tokens: Array<TokenInfo>, lp: LuaParse): any {
    var index: number = tokens.length - 1;
    while (true) {
        CLog();
        if (index < 0) break;
        var token: TokenInfo = tokens[index]
        if (lp.consume('function', token, TokenTypes.Keyword)) {
            var nextToken: TokenInfo = tokens[index + 1]
            if (nextToken.type == TokenTypes.Identifier) {
                var nextToken1: TokenInfo = tokens[index + 2]
                if (lp.consume(':', nextToken1, TokenTypes.Punctuator)) {
                    var moduleName: string = nextToken.value;
                    var data = { moduleName: moduleName, token: nextToken };
                    return data
                }

                else index--
            } else {
                index--;

            }
        } else {
            index--;
        }
    }
    return null
}


export function getParamComment(param: string, comments: Array<LuaComment>) {
    var paramName: string = "@" + param + "";
    for (var i: number = 0; i < comments.length; i++) {
        var comment = comments[i].content
        if (comment.indexOf(paramName) > -1) {
            comment = comment.replace(paramName, "")
            comment = trimCommentStr(comment)
            return comment;
        }
    }
    return "";

}



export function openFolderInExplorer(folder) {
    var command = null;
    switch (process.platform) {
        case 'linux':
            command = 'xdg-open ' + folder;
            break;
        case 'darwin':
            command = 'open ' + folder;
            break;
        case 'win32':
            command = 'start ' + folder;
            ;
            break;
    }
    if (command != null) {
        cp.exec(command);
    }
}


/**
   * 如果文件夹不存在就创建一个
   */
export function createDirIfNotExists(dir: string): boolean {
    if (!fs.existsSync(dir)) {
        try {
            fs.mkdirSync(dir);

            console.log('Common目录创建成功');
            return true
        } catch (error) {
            console.log(error)
            return false
        }

    }



};