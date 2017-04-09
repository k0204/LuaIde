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

// import { workspace, Disposable, ExtensionContext, window, TextDocumentChangeEvent } from 'vscode';
import { LanguageClient, LanguageClientOptions, SettingMonitor, ServerOptions, TransportKind } from 'vscode-languageclient';
import { LuaParse } from './luatool/LuaParse';
import vscode = require('vscode');
import { ExtensionManager } from "./luatool/ex/ExtensionManager"

// export function createServer():net.Server
// {

// var HOST:string = '127.0.0.1';
// var PORT:number = 8172;
// var server:net.Server = net.createServer(function(sock) {
//     // 我们获得一个连接 - 该连接自动关联一个socket对象
//     console.log('CONNECTED: ' +
//    sock.remoteAddress + ':' + sock.remotePort);


// 	setTimeout(function()

// 	 {
// 		 sock.write("SETB")

// 	 },4000)
//     // 为这个socket实例添加一个"data"事件处理函数
//     sock.on('data', function(data) {
//         console.log('DATA ' + sock.remoteAddress + ': ' + data);
//         // 回发该数据，客户端将收到来自服务端的数据
//         sock.write('You said "' + data + '"');
//     });

//     // 为这个socket实例添加一个"close"事件处理函数
//     sock.on('close', function(data) {
//         console.log('CLOSED: ' +
//             sock.remoteAddress + ' ' + sock.remotePort);
//     });

// }).listen(PORT, HOST);
// return server
// }

const initialConfigurations = [
	{
		name: 'Lua-Debug',
		type: 'lua',
		request: 'launch',
		program: '${workspaceRoot}/scripts/main.lua',
		stopOnEntry: true
	}
]

let diagnosticCollection: vscode.DiagnosticCollection;
let currentDiagnostic: vscode.Diagnostic;
export function activate(context: vscode.ExtensionContext) {
	
	var extensionPath = vscode.extensions.getExtension("kangping.luaide").extensionPath
	var srpitLuaPath = path.join(extensionPath, "Template", "LoadScript", "LoadScript.lua")
	var template = context.asAbsolutePath("Template\\CreateModuleFunctionTemplate.lua")
	var em = new ExtensionManager(context);

	diagnosticCollection = vscode.languages.createDiagnosticCollection('lua');
	
	let luaParse = new LuaParse(diagnosticCollection)
	
	context.subscriptions.push(
		vscode.languages.registerCompletionItemProvider(LUA_MODE,
			new LuaCompletionItemProvider(), '.', ":"));
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
		var uri: vscode.Uri = uris[index];
	
		if(uri.fsPath.indexOf("FileTemplates") > -1 || uri.fsPath.indexOf("FunTemplate") > -1){
			index++;
			parseLuaFile()
			return;
		}
		vscode.workspace.openTextDocument(uris[index]).then(
			doc => {
				luaParse.Parse(uri, doc.getText())
				index++;
				// console.log(uri.path)
				 vscode.window.setStatusBarMessage(uri.path)
				if (index < uris.length) {
					parseLuaFile()
				}

				else {
					 vscode.window.showInformationMessage("check complete!")
					 vscode.window.setStatusBarMessage("")
				}
			}
		)
	}

	vscode.workspace.findFiles("**/*.lua", "", 10000).then(
		value => {
			if(value == null)return
			 
			let count = value.length;
			value.forEach(element => {
				uris.push(element);
			});
			// console.log(uris.length)
			parseLuaFile();
		})

	vscode.workspace.onDidSaveTextDocument(event => {
		if (event.languageId == "lua") {
			if(event.uri.fsPath.indexOf("FileTemplates") > -1 || event.uri.fsPath.indexOf("FunTemplate")> -1){
				return
			}
			var uri = event.fileName
			luaParse.Parse(event.uri, event.getText())
		}
	});

	context.subscriptions.push(vscode.commands.registerCommand('extension.provideInitialConfigurations', () => {
		return JSON.stringify(initialConfigurations);
	}));
	//   e.edit(function (edit) {
	//     // itterate through the selections and convert all text to Upper
	//     for (var x = 0; x < sel.length; x++) {
	//         var txt = d.getText(new Range(sel[x].start, sel[x].end));
	//         edit.replace(sel[x], txt.toUpperCase());
	//     }
	// });
	// The server is implemented in node
	// let serverModule = context.asAbsolutePath(path.join('server', 'server.js'));
	// // The debug options for the server
	// let debugOptions = { execArgv: ["--nolazy", "--debug=6024"] };

	// // If the extension is launched in debug mode then the debug server options are used
	// // Otherwise the run options are used
	// let serverOptions: ServerOptions = {
	// 	run : { module: serverModule, transport: TransportKind.ipc },
	// 	debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
	// }

	// // Options to control the language client
	// let clientOptions: LanguageClientOptions = {
	// 	// Register the server for plain text documents
	// 	documentSelector: ['lua'],
	// 	synchronize: {
	// 		// Synchronize the setting section 'languageServerExample' to the server
	// 		configurationSection: 'languageServerExample',
	// 		// Notify the server about file changes to '.clientrc files contain in the workspace
	// 		fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
	// 	}
	// }

	// // Create the language client and start the client.
	// let disposable = new LanguageClient('Language Server Example', serverOptions, clientOptions).start();
	// console.log("start");
	// // Push the disposable to the context's subscriptions so that the 
	// // client can be deactivated on extension deactivation
	// context.subscriptions.push(disposable);

}
