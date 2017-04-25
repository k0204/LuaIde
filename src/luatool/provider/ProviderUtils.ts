
import vscode = require('vscode');
import { LuaParse } from '../LuaParse'
import { LuaInfo, TokenInfo, TokenTypes, LuaComment, LuaRange, LuaErrorEnum, LuaError, LuaInfoType } from '../TokenInfo';
import { LuaParseTool } from '../LuaParseTool'
import { CLog } from '../Utils'
export class ProviderUtils {
    public static getTokens(document: vscode.TextDocument, position: vscode.Position): Array<TokenInfo> {

        var lp: LuaParse = LuaParse.lp;
        var start: vscode.Position = new vscode.Position(0, 0)
        var lpt: LuaParseTool = LuaParse.lp.lpt;
        var tokens: Array<TokenInfo> = new Array<TokenInfo>();
        lpt.Reset(document.getText(new vscode.Range(start, position)))
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
    public static getTokenByText(text:string){
         var lpt: LuaParseTool = LuaParse.lp.lpt;
        var tokens: Array<TokenInfo> = new Array<TokenInfo>();
        lpt.Reset(text)
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
    public static getComments(comments: Array<LuaComment>): string {
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

    public static getFirstComments(comments: Array<LuaComment>): string {
        if (comments == null) return "";
        var commentStr: string = null;
        if (comments.length == 1) {
            return comments[0].content;
        }
        var descStr: string = null;
        for (var i: number = 0; i < comments.length; i++) {
            var comment = comments[i].content
            var index = comment.trim().indexOf("==");
            if (index == 0) { continue }
            if (comment.indexOf("@desc:") > -1) {
                commentStr = comment;
                break;
            } else if (commentStr == null) {
                commentStr = comment;
            }
        }
        return commentStr;
    }


    public static getSelfToModuleName(tokens: Array<TokenInfo>, lp: LuaParse) {
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
    public static getSelfToModuleNameAndStartTokenIndex(uri: vscode.Uri, tokens: Array<TokenInfo>, lp: LuaParse): any {
        var index: number = tokens.length - 1;
        while (true) {
            CLog();
            if (index < 0) break;
            var token: TokenInfo = tokens[index]
            if (lp.consume('function', token, TokenTypes.Keyword)) {
                var nextToken: TokenInfo = tokens[index + 1]
                if (nextToken.type == TokenTypes.Identifier) {
                    var nextToken1: TokenInfo = tokens[index + 2]
                    if (lp.consume(':', nextToken1, TokenTypes.Punctuator) ||
                        lp.consume('.', nextToken1, TokenTypes.Punctuator)
                    ) {
                        var range: vscode.Range = null
                        var functionNameToken: TokenInfo = null
                        //方法名
                        if (tokens.length > index + 3) {
                            functionNameToken = tokens[index + 3]
                        }
                        if (functionNameToken) {
                            if (lp.luaInfoManager.getFcim(uri)) {
                                range = lp.luaInfoManager.getFcim(uri).getSymbolEndRange(functionNameToken.value)
                            } else {
                                return {}
                            }

                        }
                        var moduleName: string = nextToken.value;
                        return { moduleName: moduleName, index: index, range: range };
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


    public static getParamComment(param: string, comments: Array<LuaComment>) {
        var paramName: string = "@" + param;
        for (var i: number = 0; i < comments.length; i++) {
            var comment = comments[i].content
            if (comment.indexOf(paramName) > -1) {
                comment = comment.replace(paramName, "")
                return comment;
            }
        }
        return "";

    }

}




