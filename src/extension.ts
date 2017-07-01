/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as path from 'path';
import { LUA_MODE } from "./luatool/provider/LuaMode"
import { LuaCompletionItemProvider } from "./luatool/provider/LuaCompletionItemProvider"
import { LuaDefinitionProvider } from "./luatool/provider/LuaDefinitionProvider"
import { LuaDocumentSymbolProvider } from "./luatool/provider/LuaDocumentSymbolProvider"
import { LuaSignatureHelpProvider } from "./luatool/provider/LuaSignatureHelpProvider"
import { LuaReferenceProvider } from "./luatool/provider/LuaReferenceProvider"
import { LuaFormattingEditProvider } from "./luatool/provider/LuaFormattingEditProvider"
import { LuaFileCompletionItems } from "./luatool/manager/LuaFileCompletionItems"
var fs = require('fs');
// import { workspace, Disposable, ExtensionContext, window, TextDocumentChangeEvent } from 'vscode';
import { LanguageClient, LanguageClientOptions, SettingMonitor, ServerOptions, TransportKind } from 'vscode-languageclient';
import { LuaParse } from './luatool/LuaParse';
import vscode = require('vscode');
import { ExtensionManager } from "./luatool/ex/ExtensionManager"

import { AutoLuaComment } from "./luatool/ex/AutoLuaComment";
import { ConstInfo } from "./ConstInfo";
import { UserLoginCount } from "./luatool/UserLoginCount";



let diagnosticCollection: vscode.DiagnosticCollection;
let currentDiagnostic: vscode.Diagnostic;
export function activate(context: vscode.ExtensionContext) {
	
	
	var luaCodeExtension = vscode.extensions.getExtension(ConstInfo.extensionLuaCodeConfig)
	
	var luaIdeExtension = vscode.extensions.getExtension(ConstInfo.extensionLuaIdeConfig)
	if((luaCodeExtension != null && luaCodeExtension.isActive) || (luaIdeExtension != null && luaIdeExtension.isActive)){
		return;
	}
	var em = new ExtensionManager(context);
	diagnosticCollection = vscode.languages.createDiagnosticCollection('lua');
	let luaParse = new LuaParse(diagnosticCollection)
	context.subscriptions.push(
		vscode.languages.registerCompletionItemProvider(LUA_MODE,
			new LuaCompletionItemProvider(), '.', ":",'"',"[","@"));
	context.subscriptions.push(
		vscode.languages.registerDefinitionProvider(LUA_MODE, new LuaDefinitionProvider()));
	context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(LUA_MODE,
		new LuaDocumentSymbolProvider()));
	context.subscriptions.push(vscode.languages.registerSignatureHelpProvider(LUA_MODE, new LuaSignatureHelpProvider(), '(', ','));

	context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider(LUA_MODE, new LuaFormattingEditProvider()));
	context.subscriptions.push(vscode.languages.registerDocumentRangeFormattingEditProvider(LUA_MODE, new LuaFormattingEditProvider()));

	


	context.subscriptions.push(diagnosticCollection);
	var uris: Array<vscode.Uri> = new Array<vscode.Uri>();
	var index: number = 0;
	function parseLuaFile() {
		if (index >= uris.length) {
			vscode.window.showInformationMessage("check complete!")
			//  vscode.window.setStatusBarMessage("")
			em.barItem.text = "捐献(LuaIde)"
			return
		}
		var uri: vscode.Uri = uris[index];
		var fileInfo = fs.statSync(uri.fsPath)
		var kbSize = fileInfo.size / 1024
		if(kbSize > em.luaIdeConfigManager.maxFileSize){
			index++
			parseLuaFile()
			return;
		}

		if (uri.fsPath.toLowerCase().indexOf("filetemplates") > -1 || uri.fsPath.toLowerCase().indexOf("funtemplate") > -1) {
			index++;
			parseLuaFile()
			return;
		}
		
		vscode.workspace.openTextDocument(uris[index]).then(
			doc => {
				
					em.barItem.text = uri.path;
					LuaFileCompletionItems.getLuaFileCompletionItems().addCompletion(uri,false)
					luaParse.Parse(uri, doc.getText())
					index++;
					parseLuaFile()
				
			}
		).then(function(event) {
			// console.log(event)
		},function(reason){
			// console.log(reason)
			index++;
			parseLuaFile()
		})
	}
	var count = 0
    var maxCount = 1
    function parseLuaFileCount(){
        count++;
        if(maxCount == count){
             parseLuaFile(); 
        }
    }
    var config = vscode.workspace.getConfiguration("files")
    for (var key in  config.associations) {
        console.log(key)
        console.log(config.associations[key])
        if(config.associations[key] == "lua"){
            maxCount++;
			var keys = key.split(".")
			if(keys.length >= 1){
				LuaFileCompletionItems.getLuaFileCompletionItems().fileExtnames.push("."+keys[keys.length-1])
			}
			
            vscode.workspace.findFiles("**/"+key, "", 10000).then(
            value => {
                if (value == null) return

                let count = value.length;
                value.forEach(element => {
                    uris.push(element);
                });
                parseLuaFileCount()
                //  console.log(uris.length)
               // parseLuaFile();
            })
        }
    }
	vscode.workspace.findFiles("**/*.lua", "", 10000).then(
		value => {
			if (value == null) return

			let count = value.length;
			value.forEach(element => {
				uris.push(element);
			});
			//  console.log(uris.length)
			parseLuaFileCount();
		})

	vscode.workspace.onDidSaveTextDocument(event => {
		
		
			if (event.languageId == "lua") {
				var fileInfo = fs.statSync(event.uri.fsPath)
				var kbSize = fileInfo.size / 1024
				if(kbSize > em.luaIdeConfigManager.maxFileSize){
					return;
				}
				LuaFileCompletionItems.getLuaFileCompletionItems().addCompletion(event.uri,false)
				if (event.uri.fsPath.toLowerCase().indexOf("filetemplates") > -1 || event.uri.fsPath.toLowerCase().indexOf("funtemplate") > -1) {
					return
				}
				
				var uri = event.fileName
				luaParse.Parse(event.uri, event.getText())
			}
	});
	
	vscode.workspace.onDidChangeTextDocument(event => {
		var fileInfo = fs.statSync(event.document.uri.fsPath)
		var kbSize = fileInfo.size / 1024
		if(kbSize > em.luaIdeConfigManager.maxFileSize){
			return;
		}
		if(AutoLuaComment.checkComment(event)){
			
		}
		if (ExtensionManager.em.luaIdeConfigManager.changeTextCheck) {
			if (event.document.languageId == "lua") {

				if (event.document.uri.fsPath.toLowerCase().indexOf("filetemplates") > -1 || event.document.uri.fsPath.toLowerCase().indexOf("funtemplate") > -1) {
					return
				}
				
				var uri = event.document.fileName
				luaParse.Parse(event.document.uri, event.document.getText(),false)

			}
		}
	})
}