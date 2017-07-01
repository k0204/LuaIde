import vscode = require('vscode');
import cp = require('child_process');
import { LuaParse } from '../LuaParse'
import { LuaInfoManager } from '../LuaInfoManager'
import { LuaFiledCompletionInfo } from "../provider/LuaFiledCompletionInfo"
import { FileCompletionItemManager } from "../manager/FileCompletionItemManager"
import { LuaFileCompletionItems } from "../manager/LuaFileCompletionItems";

import { LuaInfo, TokenInfo, TokenTypes, LuaComment, LuaRange, LuaErrorEnum, LuaError, LuaInfoType } from '../TokenInfo';
import { LuaCompletionItemControler } from "./LuaCompletionItemControler";
import { CLog, getSelfToModuleName, getCurrentFunctionName, getTokens, isIdentifierPart } from '../Utils'
export function byteOffsetAt(document: vscode.TextDocument, position: vscode.Position): vscode.Location {

    var lineText = document.lineAt(position.line).text;
    if (lineText.trim().substring(0, 2) == "--") {

        return checkComment(lineText, position)
    }
    //检查是不是路径字符串
    var tempStr = lineText.substring(position.character)
    var endIndex = tempStr.indexOf('"')
    if (endIndex > -1) {
        var startStr = lineText.substring(0, position.character)
        var findex = startStr.lastIndexOf('"')
        if (findex > -1) {

            var moduleName = lineText.substring(findex + 1, endIndex + position.character)
            if (moduleName.length > 0) {
                var uri = LuaFileCompletionItems.getLuaFileCompletionItems().getUriCompletionByModuleName(moduleName)
                if (uri) {
                    var location: vscode.Location =
                        new vscode.Location(uri, new vscode.Position(0, 0))
                    return location;
                }

            }

        }


    }
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
    var lashToken: TokenInfo = null
    if (tokens) {
        i = tokens.length - 1;
    }
    while (i >= 0) {

        CLog();
        var token: TokenInfo = tokens[i];
        i--;
        if (lp.consume(':', token, TokenTypes.Punctuator) ||
            lp.consume('.', token, TokenTypes.Punctuator)
        ) {
            if (i - 1 >= 0) {
                if (tokens[i].type == TokenTypes.Identifier &&
                    lp.consume('function', tokens[i - 1], TokenTypes.Keyword)) {
                    var posToken = tokens[i - 1]
                    var line = posToken.line;
                    return new vscode.Location(document.uri, new vscode.Position(line, 0))


                }


            }
        }
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
        lashToken = token;
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
        var data = getSelfToModuleName(tokens, lp)
        keyNames[0] = data.moduleName

        isSelf = true
    }
    var location: vscode.Location = null;
    location = checkCurrentDocument(document, luaManager, keyNames, tokens);
    if (location) {
        return location;
    }

    // var findInfos: Array<LuaFiledCompletionInfo> = new Array<LuaFiledCompletionInfo>();
    // getLocation(keyNames, luaManager, 1, findInfos)
    // getLocation(keyNames, luaManager, 2, findInfos)
    // var fInfo: LuaFiledCompletionInfo;

    // for (var i = 0; i < keyNames.length; i++) {

    //     for (var j = 0; j < findInfos.length; j++) {
    //         var f: LuaFiledCompletionInfo = findInfos[j]
    //         if (f.parent && f.parent.uri.path.toLocaleLowerCase().indexOf(keyNames[i].toLocaleLowerCase()) > -1) {
    //             fInfo = f;
    //             break
    //         }
    //         else if (f.uri.path.toLocaleLowerCase().indexOf(keyNames[i].toLocaleLowerCase()) > -1) {
    //             fInfo = f;
    //             break
    //         }
    //     }
    //     if (fInfo != null) {
    //         location = new vscode.Location(fInfo.uri, fInfo.position)
    //         return location
    //     }
    // }

    // if (findInfos.length > 0) {
    //     location = new vscode.Location(findInfos[0].uri, findInfos[0].position)
    //     return location
    // }


    // if (isSelf == true && location == null) {
    //     var rootInfo: FileCompletionItemManager = luaManager.fileCompletionItemManagers.get(document.uri.path)
    //     if (rootInfo) {
    //         var selfCInfo: LuaFiledCompletionInfo;//= rootInfo.luaFiledCompletionInfo;

    //         keyNames[0] = 'self'

    //         for (var i = 0; i < keyNames.length; i++) {
    //             selfCInfo = selfCInfo.getItemByKey(keyNames[i])
    //         }
    //         if (selfCInfo) {
    //             var location: vscode.Location =
    //                 new vscode.Location(selfCInfo.uri, selfCInfo.position)
    //             return location;
    //         }
    //     }
    // }
    // return location;
    return location;
}
function checkCurrentDocument(document: vscode.TextDocument, luaManager: LuaInfoManager, keyNames: Array<string>, tokens: Array<TokenInfo>) {
    var citems: Array<LuaFiledCompletionInfo> = new Array<LuaFiledCompletionInfo>();

    var fcim = luaManager.getFcim(document.uri)
    var functionNames: Array<string> = getCurrentFunctionName(tokens)
    var funRootItem = null;
    if (functionNames != null && functionNames.length > 0) {

        var args = fcim.getSymbolArgsByNames(functionNames)
        if (keyNames.length == 1) {
            //参数查找
            for (var index = 0; index < args.length; index++) {
                var arg = args[index];
                if (arg.label == keyNames[0]) {
                    var location: vscode.Location =
                        new vscode.Location(document.uri, arg.position)
                    return location
                }
            }
        }
        //方法内的变量

        for (var index = 0; index < functionNames.length; index++) {
            var fname = functionNames[index];

            funRootItem = fcim.luaFunFiledCompletions.get(fname)
            funRootItem = DefinitionFindItem(funRootItem, keyNames, 0)
            if (funRootItem != null) {
                return new vscode.Location(funRootItem.uri, funRootItem.position)
            }
        }
        //方法查找
    }
    funRootItem = DefinitionFindItem(fcim.luaFunCompletionInfo, keyNames, 0);
    if (funRootItem != null && funRootItem.isNewVar == true) {
        return new vscode.Location(funRootItem.uri, funRootItem.position)
    }
    //文件全局查找
    funRootItem = DefinitionFindItem(fcim.luaFileGolbalCompletionInfo, keyNames, 0);
    if (funRootItem != null && funRootItem.isNewVar == true) {
        return new vscode.Location(funRootItem.uri, funRootItem.position)
    }
    //项目全局
    funRootItem = DefinitionFindItem(fcim.luaGolbalCompletionInfo, keyNames, 0);
    if (funRootItem != null && funRootItem.isNewVar == true) {
        return new vscode.Location(funRootItem.uri, funRootItem.position)
    }

    //先 根据变量名字 找找对应的文件名 如果有 那么 直接确定为该文件
    var fileCompletionItemManagers: Map<string, FileCompletionItemManager> = luaManager.fileCompletionItemManagers
    for (var info of fileCompletionItemManagers) {

        if (info[0].indexOf("modulePath") > -1) {
            var xx = 1;

        }
        console.log(info[0])
        funRootItem = DefinitionFindItem(info[1].luaGolbalCompletionInfo, keyNames, 0);
        if (funRootItem != null && funRootItem.isNewVar == true) {
            return new vscode.Location(funRootItem.uri, funRootItem.position)
        }
        funRootItem = DefinitionFindItem(info[1].luaFunCompletionInfo, keyNames, 0);
        if (funRootItem != null) {
            return new vscode.Location(funRootItem.uri, funRootItem.position)
        }
        if (info[1].rootCompletionInfo != null && keyNames[0] == info[1].rootCompletionInfo.label) {
            funRootItem = DefinitionFindItem(info[1].rootCompletionInfo, keyNames, 2);
            if (funRootItem != null && funRootItem.isNewVar == true) {
                return new vscode.Location(funRootItem.uri, funRootItem.position)
            }
        }

    }





}
function FindItemByFileName(keyNames: Array<string>) {
    //还没找到 那么就根据名字找依照
    for (var index = 0; index < keyNames.length; index++) {
        var element = keyNames[index];

    }

}
function DefinitionFindItem(rootItem: LuaFiledCompletionInfo, keys: Array<string>, index: number) {
    if (rootItem == null) return null
    rootItem = rootItem.getItemByKey(keys[index])
    if (index == keys.length - 1) {
        return rootItem
    } else {
        if (rootItem != null) {
            index++;
            rootItem = DefinitionFindItem(rootItem, keys, index)
            return rootItem
        } else {
            return null
        }
    }
}





function checkComment(line: string, position: vscode.Position) {
    var index1 = line.indexOf('[')
    var index2 = line.indexOf(']');
    var moduleName = line.substring(index1 + 1, index2)
    if (position.character > index1 && position.character < index2) {
        var uri = LuaFileCompletionItems.getLuaFileCompletionItems().getUriCompletionByModuleName(moduleName)

        var location: vscode.Location =
            new vscode.Location(uri, new vscode.Position(0, 0))
        return location;
    }

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
        if (k != LuaParse.checkTempFilePath) {
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

            }
        }
    })

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




