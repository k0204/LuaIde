/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';
import {LuaParse} from '../LuaParse'
import {  LuaInfo, TokenInfo, TokenTypes, LuaComment, LuaRange, LuaErrorEnum, LuaError, LuaInfoType} from '../TokenInfo';
import { languages, window, commands, SignatureHelpProvider, SignatureHelp, SignatureInformation, ParameterInformation, TextDocument, Position, Range, CancellationToken } from 'vscode';

import {FileCompletionItemManager} from "../manager/FileCompletionItemManager"
import {LuaFiledCompletionInfo} from './LuaFiledCompletionInfo'
import {CLog,getParamComment,getSelfToModuleName,getTokens,getFirstComments} from '../Utils'
export class LuaSignatureHelpProvider implements SignatureHelpProvider {

	public provideSignatureHelp(document: TextDocument, position: Position, token: CancellationToken): Promise<SignatureHelp> {

		let result: SignatureHelp = this.walkBackwardsToBeginningOfCall(document, position);

		return Promise.resolve(result)
        //需要判断参数是否为一个function  如果为 function  那么  直接退出 不做返回

		// let text = "updateBufferTxtImage(  parentNode,animationItem,resourceID,animationHandler)";
		// let nameEnd = text.indexOf(' ');
		// let sigStart = nameEnd + 5; // ' func'
		// let funcName = text.substring(0, nameEnd);
		// let sig = text.substring(sigStart);
		// let si = new SignatureInformation(funcName + sig, "简单介绍");
		// si.parameters = []
		// si.parameters.push(new ParameterInformation("parentNode"))
		// si.parameters.push(new ParameterInformation("animationItem"))
		// si.parameters.push(new ParameterInformation("resourceID"))
		// si.parameters.push(new ParameterInformation("animationHandler"))
		// result.signatures = [si];
		// result.activeSignature = 0;
		// result.activeParameter = 1
		// return Promise.resolve(result);
	}



	private walkBackwardsToBeginningOfCall(document: TextDocument, position: Position): SignatureHelp {
		var lp: LuaParse = LuaParse.lp;
		var tokens: Array<TokenInfo> = getTokens(document, position)
		var index: number = tokens.length - 1;
		var count: number = 0;
		var cIdex: number = 0;
		let signature:SignatureHelp = null;
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
			
			var key: string = keys[keys.length-1]
			if (key == "self") {
				var moduleName = getSelfToModuleName(tokens, lp)
				if (moduleName == null) {
					return
				} else {
					key = moduleName;
				}
			}
			
			lp.luaInfoManager.fileCompletionItemManagers.forEach((v, k) => {
				var luaFunCompletionInfo: LuaFiledCompletionInfo = v.luaFunCompletionInfo
				//找方法
				index = keys.length-1
				while (true) {
					CLog();
					
					var lfci: LuaFiledCompletionInfo = luaFunCompletionInfo.getItemByKey(key)
				
					
					if (lfci != null) {
						luaFunCompletionInfo = lfci;
						index--;
						var pkey: string = keys[index]
						index--;
						key = keys[index]
					}else
					{
						break;
					}
					if (index < 0) {
						break;
					}
				}
				if (luaFunCompletionInfo != null && luaFunCompletionInfo != v.luaFunCompletionInfo) {
					//找到了
					let result = new SignatureHelp();
					let si = new SignatureInformation(luaFunCompletionInfo.label, getFirstComments(luaFunCompletionInfo.comments));
					si.parameters = []
					var pstr = "("
					if (luaFunCompletionInfo.params) {
						luaFunCompletionInfo.params.forEach(param => {
							pstr += param + ",";
							si.parameters.push(new ParameterInformation(param, getParamComment(param, luaFunCompletionInfo.comments)))
						})
						pstr = pstr.substr(0, pstr.length - 1);
					}

					pstr += ")"
					si.label = si.label + pstr
					// console.log("si.label:" + si.label)
					result.signatures = [si];
					result.activeSignature = 0;
					result.activeParameter = cIdex

					// console.log("找到了")
					signature = result 
					return
				} else {
					//没找到
					// console.log("没到了")
				}
			})
		}
		return signature
	}
}
