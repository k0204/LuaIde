import vscode = require('vscode');
import {ExtensionManager} from '../ex/ExtensionManager';
export function getAsAbsolutePath(path)
{
    var p:string = ExtensionManager.em.golbal.context.asAbsolutePath(path)
    p = p.replace(/\\/g, "/");
    return p;
}

