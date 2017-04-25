export class UserInfo
{
    public uuid:string;
    public donateShowMonth:string;
    public showIndex:number;

    public donateInfo:Array<boolean>;
    constructor(info)
    {
        if(info == null){
           this.uuid = this.createUuid();
           this.donateShowMonth = ""
           this.showIndex = 0
           this.donateInfo = [false,false]
        }else
        {
            this.donateInfo = info.donateInfo
            if(this.donateInfo == null)
            {
                 this.donateInfo = [false,false]
            }
            this.uuid = info.uuid
           this.donateShowMonth = info.donateShowMonth
            this.showIndex = info.showIndex
            this.showIndex = this.showIndex == null ?0 :this.showIndex
        }
    }
    private createUuid() {
        var s = [];
        var hexDigits = "0123456789abcdef";
        for (var i = 0; i < 36; i++) {
            s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
        }
        s[14] = "4"; // bits 12-15 of the time_hi_and_version field to 0010
        s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1); // bits 6-7 of the clock_seq_hi_and_reserved to 01
        s[8] = s[13] = s[18] = s[23] = "-";

        var uuid = s.join("");
        return uuid;
    }
    public toString():string
    {
        var data:any = {}
        data.uuid = this.uuid;
        data.donateShowMonth = this.donateShowMonth;
        data.showIndex = this.showIndex
        data.donateInfo = this.donateInfo
       return JSON.stringify(data)
    }


}