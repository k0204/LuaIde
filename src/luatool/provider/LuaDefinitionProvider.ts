import vscode = require('vscode');
import cp = require('child_process');
import {LuaParse} from '../LuaParse'
import {LuaInfoManager} from '../LuaInfoManager'
import {LuaFiledCompletionInfo} from "../provider/LuaFiledCompletionInfo"
import {FileCompletionItemManager} from "../manager/FileCompletionItemManager"

import {CLog, getTokens, isIdentifierPart, getSelfToModuleName} from "../Utils"
import {  LuaInfo, TokenInfo, TokenTypes, LuaComment, LuaRange, LuaErrorEnum, LuaError, LuaInfoType} from '../TokenInfo';

export function byteOffsetAt(document: vscode.TextDocument, position: vscode.Position): vscode.Location {
    let offset = document.offsetAt(position);
    let text = document.getText();
    let byteOffset = 0;
    var isFun: boolean = false;
    var nameChats: Array<string> = new Array<string>();
    var luaManager: LuaInfoManager = LuaParse.lp.luaInfoManager;
    var lp: LuaParse = LuaParse.lp;
    var tokens: Array<TokenInfo> = getTokens(document, position)
    var isFun: boolean = false
    var i: number = 0;
    if(tokens)
    {
       i = tokens.length - 1;
    }
    while (i >= 0) {

        CLog();
        var token: TokenInfo = tokens[i];
        i--;
        if (lp.consume('function', token, TokenTypes.Keyword)) {
            return null;
        }
        if (token.type == TokenTypes.Keyword || lp.consume('(', token, TokenTypes.Punctuator)
            || lp.consume(')', token, TokenTypes.Punctuator)

        ) {
            isFun = true
            break;
        } else if (

            lp.consume('+', token, TokenTypes.Punctuator)
            || lp.consume('-', token, TokenTypes.Punctuator)
            || lp.consume('*', token, TokenTypes.Punctuator)
            || lp.consume('/', token, TokenTypes.Punctuator)
            || lp.consume('>', token, TokenTypes.Punctuator)
            || lp.consume('<', token, TokenTypes.Punctuator)
            || lp.consume('>=', token, TokenTypes.Punctuator)
            || lp.consume('<=', token, TokenTypes.Punctuator)
            || lp.consume('==', token, TokenTypes.Punctuator)
            || lp.consume('~=', token, TokenTypes.Punctuator)
            || lp.consume('=', token, TokenTypes.Punctuator)
            || lp.consume('#', token, TokenTypes.Punctuator)
            || lp.consume('}', token, TokenTypes.Punctuator)
            || lp.consume('{', token, TokenTypes.Punctuator)
            || lp.consume(']', token, TokenTypes.Punctuator)
            || lp.consume('[', token, TokenTypes.Punctuator)
            || lp.consume(',', token, TokenTypes.Punctuator)
            || lp.consume(';', token, TokenTypes.Punctuator)
            || lp.consume('else', token, TokenTypes.Punctuator)
            || lp.consume('elseif', token, TokenTypes.Punctuator)
            || lp.consume('do', token, TokenTypes.Keyword)
            
        ) {
            break;
        }

        nameChats.push(token.value);
        if (i >= 0) {
            var nextToken: TokenInfo = tokens[i];
            if (token.type == TokenTypes.Identifier && (
                nextToken.type == TokenTypes.Identifier ||
                nextToken.type == TokenTypes.NumericLiteral ||
                nextToken.type == TokenTypes.Keyword ||
                nextToken.type == TokenTypes.StringLiteral ||
                nextToken.type == TokenTypes.NilLiteral ||
                nextToken.type == TokenTypes.BooleanLiteral)) {
                break;
            }
        }

    }

    nameChats = nameChats.reverse()
    for (let i = offset; i < text.length; i++) {
        var chat = text.charCodeAt(i)
        if (isIdentifierPart(chat)) {
            nameChats.push(text[i])
        }
        else if (text[i] == '=' ||
            text[i] == '==' ||
            text[i] == '~=' ||
            text[i] == ')' ||
            text[i] == ']' ||
            text[i] == '[' ||
            text[i] == '}' ||
            text[i] == '+' ||
            text[i] == '-' ||
            text[i] == '*' ||
            text[i] == '/' ||
            text[i] == '>' ||
            text[i] == '<' ||
            text[i] == '>=' ||
            text[i] == '<='
        ) {
            break;
        }
        else {
            if (chat == 40) {
                isFun = true;
            }

            break;
        }
    }
    var n = ""
    nameChats.forEach(c => {
        n += c;
    });
    // console.log(n)
    //分割
    var keyNames: Array<string> = new Array<string>();
    var tempNames: Array<string> = n.split('.')
    for (var i = 0; i < tempNames.length; i++) {
        if (i == tempNames.length - 1) {
            var tempNames1 = tempNames[tempNames.length - 1].split(':')
            for (var j = 0; j < tempNames1.length; j++) {
                keyNames.push(tempNames1[j])
            }
        } else {
            keyNames.push(tempNames[i])
        }
    }
    var isSelf: boolean = false;
    if (keyNames[0] == 'self') {
        keyNames[0] = getSelfToModuleName(tokens, lp)

        isSelf = true
    }
    var findInfos: Array<LuaFiledCompletionInfo> = new Array<LuaFiledCompletionInfo>();
    getLocation(keyNames, luaManager, 1, findInfos)
    getLocation(keyNames, luaManager, 2, findInfos)
    var fInfo: LuaFiledCompletionInfo;
    var location: vscode.Location = null;
    for (var i = 0; i < keyNames.length; i++) {
       
        for(var j = 0; j < findInfos.length;j++)
        {    
            var f:LuaFiledCompletionInfo = findInfos[j]
            if(f.parent && f.parent.uri.path.toLocaleLowerCase().indexOf(keyNames[i].toLocaleLowerCase()) > -1)
            {
                fInfo = f;
                break
            }
            else if (f.uri.path.toLocaleLowerCase().indexOf(keyNames[i].toLocaleLowerCase()) > -1) {
                fInfo = f;
                break
            }
        }
        if (fInfo != null) {
            location = new vscode.Location(fInfo.uri, fInfo.position)
            return location
        }
    }
   
    if(findInfos.length> 0)
    {
        location = new vscode.Location(findInfos[0].uri, findInfos[0].position)
        return location
    }
    // for (var i = 0; i < keyNames.length; i++) {
    //     findInfos.forEach(f => {
    //         if (f.label.toLocaleLowerCase() == keyNames[i].toLocaleLowerCase()) {
    //             fInfo = f;
    //             return
    //         }
    //     });
    //     if (fInfo != null) {
    //         location = new vscode.Location(fInfo.uri, fInfo.position)
    //         return location
    //     }
    // }

    if (isSelf == true && location == null) {
        var rootInfo: FileCompletionItemManager = luaManager.fileCompletionItemManagers.get(document.uri.path)
        if (rootInfo) {
            var selfCInfo: LuaFiledCompletionInfo = rootInfo.luaFiledCompletionInfo;

            keyNames[0] = 'self'
           
            for (var i = 0; i < keyNames.length; i++) {
                selfCInfo = selfCInfo.getItemByKey(keyNames[i])
            }
            if (selfCInfo) {
                var location: vscode.Location =
                    new vscode.Location(selfCInfo.uri, selfCInfo.position)
                return location;
            }
        }
    }
    return location;
}
function getCompletionByKeyNams(cinfo: LuaFiledCompletionInfo, keyNames: Array<string>, type: number): LuaFiledCompletionInfo {
    var findInfo: LuaFiledCompletionInfo = cinfo;
    var i: number = 0
    for (i = 0; i < keyNames.length; i++) {
        var key: string = keyNames[i];
        var tempInfo: LuaFiledCompletionInfo = findInfo.getItemByKey(key, type == 1);
        if (tempInfo != null) {
            findInfo = tempInfo;
            i++;
            break;
        }
    }

    for (i; i < keyNames.length; i++) {
        var key: string = keyNames[i];
        var tempInfo: LuaFiledCompletionInfo = findInfo.getItemByKey(key, type == 1);
        if (tempInfo != null) {
            findInfo = tempInfo;
        } else {
            findInfo = null;
            break
        }
    }


    if (findInfo != null && findInfo != cinfo) {
        return findInfo;
    } else {
        return null;
    }


}
function getLocation(keyNames: Array<string>, luaManager: LuaInfoManager, type: number, findInfos: Array<LuaFiledCompletionInfo>) {
    var notModlueInfos: Array<LuaFiledCompletionInfo> = new Array<LuaFiledCompletionInfo>();
    var notModlueInfosIndex: Array<number> = new Array<number>();

    var notModlueInfosIndex: Array<number> = new Array<number>();
    //先找fun
    var cinfo: LuaFiledCompletionInfo = null;
    var location: vscode.Location = null
    
    luaManager.fileCompletionItemManagers.forEach((v, k) => {
       
        var tempInfo: LuaFiledCompletionInfo = null;
        if (type == 1) {
            tempInfo = v.luaFunCompletionInfo;//.getItemByKey(key,true)
        }
        else if (type == 2) {
            tempInfo = v.luaGolbalCompletionInfo;//.getItemByKey(key)
        }
        var findInfo: LuaFiledCompletionInfo = getCompletionByKeyNams(tempInfo, keyNames, type)
        if (findInfo) {
            findInfos.push(findInfo)
            // location = new vscode.Location(findInfo.uri, findInfo.position)
            // return
        }
    })
    //    var fInfo: LuaFiledCompletionInfo;
    //     for(var i = 0; i < keyNames.length;i++)
    //     {
    //         findInfos.forEach(f => {
    //             if(f.label.toLocaleLowerCase() == keyNames[i].toLocaleLowerCase())
    //             {
    //                  fInfo = f;
    //                  return
    //             }

    //         });
    //         if(fInfo != null){
    //             location = new vscode.Location(fInfo.uri, fInfo.position)
    //             return location
    //         }
    //     }

    //     return location



    // for (var i = keyNames.length - 1; i >= 0; i--) {

    //     var key = keyNames[i];

    //     luaManager.fileCompletionItemManagers.forEach((v, k) => {
    //     var tempInfo: LuaFiledCompletionInfo = null;
    //         if (type == 1) {
    //             tempInfo = v.luaFunCompletionInfo.getItemByKey(key,true)
    //         }
    //         else if(type == 2)
    //         {
    //             tempInfo = v.luaGolbalCompletionInfo.getItemByKey(key)
    //         } 

    //         if (tempInfo != null) {

    //             if (type == 2) {
    //                 notModlueInfos.push(tempInfo);
    //                 console.log("length:" + tempInfo.items.values.length)
    //                 notModlueInfosIndex.push(i)
    //                 var filePath: string = tempInfo.uri.path
    //                 var index: number = filePath.lastIndexOf('/') + 1
    //                 var fileName = filePath.substr(index, filePath.length - index)
    //                 fileName = fileName.replace(".lua", "");
    //                 if (fileName.toLowerCase() == tempInfo.label.toLocaleLowerCase()) {
    //                     cinfo = tempInfo;
    //                     console.log("i:"+i);
    //                     return;
    //                 }
    //             } else {
    //                 cinfo = tempInfo;
    //                 console.log("i:"+i);
    //                 return;
    //             }
    //         }
    //     })

    //     if (cinfo != null) {

    //         if (i == keyNames.length - 1) {
    //             if (i == keyNames.length - 1) {
    //                 var location: vscode.Location = new vscode.Location(cinfo.uri, cinfo.position)
    //                 return location;
    //             } else {

    //             }
    //         } else {
    //             for (var j = i + 1; j < keyNames.length; j++) {

    //                 cinfo = cinfo.getItemByKey(keyNames[j])
    //                 if (cinfo) {
    //                 } else {
    //                     break;
    //                 }
    //             }
    //             if (cinfo != null) {
    //                 var location: vscode.Location = new vscode.Location(cinfo.uri, cinfo.position)
    //                 return location;
    //             }
    //         }
    //     }



    // for (var j = 0; j < notModlueInfos.length; j++) {
    //     var ninfo = notModlueInfos[j];

    //     if (i == keyNames.length - 1) {
    //         if (i == keyNames.length - 1) {
    //             var location: vscode.Location = new vscode.Location(ninfo.uri, ninfo.position)
    //             return location;
    //         } else {

    //         }
    //     } else {
    //         for (var k = notModlueInfosIndex[j]+1; k < keyNames.length; k++) {

    //             ninfo = ninfo.getItemByKey(keyNames[k])
    //             if (ninfo) {
    //             } else {
    //                 break;
    //             }
    //         }
    //         if (ninfo != null) {
    //             var location: vscode.Location = new vscode.Location(ninfo.uri, ninfo.position)
    //             return location;
    //         }
    //     }

    // }


    // }
    // return null;
}


/**
 * 只解析 table 定义 和 方法  
 */
export class LuaDefinitionProvider implements vscode.DefinitionProvider {

    public provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken): Thenable<vscode.Location> {
        // 找出单词
        //往前找
        //往后找
        // document.getText()

        let pos = new vscode.Position(1, 1);

        let wordAtPosition = document.getWordRangeAtPosition(position);
        let location = byteOffsetAt(document, position);


        return new Promise<vscode.Location>((resolve, reject) => {

            return resolve(location);
        });
    }

}




