/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';
import { LuaParse } from '../LuaParse'
import { LuaInfo, TokenInfo, TokenTypes, LuaComment, LuaRange, LuaErrorEnum, LuaError, LuaInfoType } from '../TokenInfo';
import { languages, window, commands, SignatureHelpProvider, SignatureHelp, SignatureInformation, ParameterInformation, TextDocument, Position, Range, CancellationToken } from 'vscode';

import { FileCompletionItemManager } from "../manager/FileCompletionItemManager"
import { LuaFiledCompletionInfo } from './LuaFiledCompletionInfo'
import { CLog, getParamComment, getSelfToModuleName, getTokens, getFirstComments } from '../Utils'
import { LuaSymbolInformation } from "../manager/LuaSymbolInformation";
export class LuaSignatureHelpProvider implements SignatureHelpProvider {

	public provideSignatureHelp(document: TextDocument, position: Position, token: CancellationToken): Promise<SignatureHelp> {

		let result: SignatureHelp = this.walkBackwardsToBeginningOfCall(document, position);

		return Promise.resolve(result)

	}
	private createSignatureInformation(symbol:LuaSymbolInformation,cIdex:number,funName:string)
	{
		let result = new SignatureHelp();
		//拼接方法名字
		let si = new SignatureInformation(funName, symbol.containerName);
		si.parameters = []
		var pstr = "("
		symbol.argLuaFiledCompleteInfos.forEach(arg => {
			si.parameters.push(new ParameterInformation(arg.label, arg.documentation))
			pstr += arg.label + ",";
		})
		if(pstr != "(") {
			pstr = pstr.substr(0, pstr.length - 1);
		}
		
		pstr += ")"
		si.label = si.label + pstr
		// console.log("si.label:" + si.label)
		result.signatures = [si];
		result.activeSignature = 0;
		result.activeParameter = cIdex
		return result
						
	}


	private walkBackwardsToBeginningOfCall(document: TextDocument, position: Position): SignatureHelp {
		var lp: LuaParse = LuaParse.lp;
		var tokens: Array<TokenInfo> = getTokens(document, position)
		var index: number = tokens.length - 1;
		var count: number = 0;
		var cIdex: number = 0;
		let signature: SignatureHelp = null;
		while (true) {
			CLog();
			if (index < 0) {
				break;
			}

			var token: TokenInfo = tokens[index]
			if (lp.consume(')', token, TokenTypes.Punctuator)) {
				count++;
			} else if (lp.consume('(', token, TokenTypes.Punctuator)) {
				count--;
				if (count < 0) {
					index--;
					break;
				}
			}
			else if (lp.consume('end', token, TokenTypes.Keyword)) {
				count++;
				index--;
				while (true) {
					CLog();
					var ktoken: TokenInfo = tokens[index]
					if (lp.consume('then', ktoken, TokenTypes.Keyword) ||
						lp.consume('do', ktoken, TokenTypes.Keyword)

					) {
						break;
					}
					index--;
					if (index < 0) break;
				}
				continue;
			}
			else if (lp.consume(',', token, TokenTypes.Punctuator)) {
				if (count == 0) {
					cIdex++;
				}
			}
			index--;
		}


		if (index >= 0) {
			var keys: Array<string> = new Array<string>();
			while (true) {
				CLog();
				var token: TokenInfo = tokens[index];
				if (token.type == TokenTypes.Identifier) {
					keys.push(token.value)
					index--;
					if (index < 0) {
						break;
					}
					var ptoken: TokenInfo = tokens[index];
					if (
						lp.consume(':', ptoken, TokenTypes.Punctuator) ||
						lp.consume('.', ptoken, TokenTypes.Punctuator)
					) {
						index--;
						keys.push(ptoken.value)
					}
					else if (lp.consume('function', ptoken, TokenTypes.Keyword)) {
						keys = new Array<string>();
						break;
					}
					else {
						break;
					}
				} else {
					break;
				}
			}
			if(keys.length == 1){
				//检查是不是内部方法
				var fcim: FileCompletionItemManager = lp.luaInfoManager.getFcimByPathStr(document.uri.path)
				var curFunFcim:LuaSymbolInformation = null
				for (var kindex = 0; kindex < fcim.symbols.length; kindex++) {
					var element = fcim.symbols[kindex];
					//找到当前所在方法
					if(element.location.range.start.line <= position.line &&
					element.location.range.end.line >= position.line){
						curFunFcim = element
					}
				}
				if(curFunFcim != null){
					for (var index = 0; index < fcim.symbols.length; index++) {
						var element = fcim.symbols[index];
						if(element.name.indexOf(curFunFcim.name+"->"+keys[0]) > -1){
							signature = this.createSignatureInformation(element,cIdex,keys[0])
							break
						}
					}
				}
			}
			if(signature != null){
				return signature
			} 
			var key: string = keys[keys.length - 1]
			if (key == "self") {
				var data = getSelfToModuleName(tokens, lp)
				if (data == null) {
					return
				} else {
					var moduleName = data.moduleName
					keys[keys.length - 1] = moduleName
					key = moduleName;
				}
			}
			var funName: string = ""
			for (var kindex = keys.length - 1; kindex >= 0; kindex--) {

				funName += keys[kindex]
			}
			lp.luaInfoManager.fileCompletionItemManagers.forEach((v, k) => {
				for (var index = 0; index < v.symbols.length; index++) {
					var element = v.symbols[index];
					if (element.name == funName) {
						signature = this.createSignatureInformation(element,cIdex,element.name)
						return
					}

				}
			})
		}
		return signature
		


	}
}
