
import {LuaParse} from './LuaParse'
import {LuaFiledCompletionInfo} from "./provider/LuaFiledCompletionInfo"
import {LuaInfoManager} from './LuaInfoManager'
import {LuaParseTool} from './LuaParseTool'
import cp = require('child_process');
import vscode = require('vscode');
var fs = require('fs');
import {  LuaInfo, TokenInfo, TokenTypes, LuaComment, LuaRange, LuaErrorEnum, LuaError, LuaInfoType} from './TokenInfo';
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


export function getTokens(document: vscode.TextDocument, position: vscode.Position,lpt?: LuaParseTool): Array<TokenInfo> {

   
    var start: vscode.Position = new vscode.Position(0, 0)
    if( lpt ==null) {
        var lp: LuaParse = LuaParse.lp;
        lpt = LuaParse.lp.lpt;
    }
     
    var tokens: Array<TokenInfo> = new Array<TokenInfo>();
    if(position == null)
    {
        lpt.Reset(document.getText())
    }else
    {
        lpt.Reset(document.getText(new vscode.Range(start, position)))
    }
    
    while (true) {
        CLog();
        var token: TokenInfo = lpt.lex();
        if (token.error != null) {
            return ;
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
export function getDescComment(comment:string)
{
    var commentStr:string = ""
     var commentIndex:number = comment.indexOf("@desc")
        if (commentIndex > -1) {
            commentStr = comment.substring(commentIndex+5);
           commentStr = trimCommentStr(commentStr)
            
          
        } else if (commentStr == null) {
            if(comment.indexOf("@") == 0){
                commentStr =  ""
            }else
            {
                commentStr = comment;
            }
           
        }
        return commentStr
}

export function getFirstComments(comments: Array<LuaComment>): string {
    if (comments == null) return "";
    var commentStr: string = null;
    if (comments.length == 1) {
        return  getDescComment(comments[0].content);
    }
    
    for (var i: number = 0; i < comments.length; i++) {
        var comment = comments[i].content
        var index = comment.trim().indexOf("==");
        if (index == 0) { continue }
       commentStr =  getDescComment(comments[0].content)
       if(commentStr != ""){
           break
       }
    }
    return commentStr;
}
export function trimCommentStr(commentStr:string):string
{
     commentStr = commentStr.trim()
     if(commentStr.indexOf(":") == 0) 
     {
         return commentStr.substring(1)
     }else
     {
         return commentStr
     }
}


export function getSelfToModuleName(tokens: Array<TokenInfo>, lp: LuaParse) {
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
                    return moduleName;

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
    export function createDirIfNotExists(dir:string):boolean {
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