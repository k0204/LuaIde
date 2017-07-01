import { CompletionItem, CompletionItemKind,TextDocument} from 'vscode';
export class CommentLuaCompletionManager{
    public static ins:CommentLuaCompletionManager;
    public items:Array<CompletionItem>;
    constructor(){
        this.items = new Array<CompletionItem>();
        var completions = [
            {
                name:"return",
                comment:"返回值注释 例:@return [com.app.Model.TestModel]",
                insertText:"return "
            },
            {
                name:"parentClass",
                comment:"module继承注释 例:@parentClass [com.app.Model.TestModel]",
                insertText:"parentClass "
            },
            {
                name:"valueReference",
                comment:"变量引用注释 例:@valueReference [com.app.Model.TestModel]",
                insertText:"valueReference "
            },
             {
                name:"desc",
                comment:"方法描述",
                insertText:"desc"
            },

        ]
        completions.forEach(v=>{
            var item:CompletionItem = new CompletionItem(v.name,CompletionItemKind.Property)
            item.documentation = v.comment;
            item.insertText = v.insertText;
           
            this.items.push(item)
        })


    }

   

    public static getIns(){
        if(CommentLuaCompletionManager.ins == null){
            CommentLuaCompletionManager.ins = new CommentLuaCompletionManager();
        }
        return CommentLuaCompletionManager.ins;
    }

}