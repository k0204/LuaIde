import vscode = require('vscode');

export function toUpperCase()
{
    runChangeCase(function(txt:string){
        return txt.toUpperCase()
    })
}
export function toLowerCase()
{
    runChangeCase(function(txt:string){
        return txt.toLowerCase()
    })
} 

function runChangeCase(converTextFun:Function)
{
    var editor = vscode.window.activeTextEditor;
    var d = editor.document;
    var sel = editor.selections;
    editor.edit(function (edit) {
        // itterate through the selections and convert all text to Upper
        for (var x = 0; x < sel.length; x++) {
            var txt = d.getText(new vscode.Range(sel[x].start, sel[x].end));
            txt = converTextFun(txt)
            edit.replace(sel[x], txt);
            
        }
    });
}


