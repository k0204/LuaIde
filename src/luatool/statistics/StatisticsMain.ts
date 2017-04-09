import * as net from 'net';
import {UserInfo} from "../ex/UserInfo"
export class StatisticsEvent{
    public static C2S_UserInfo:number = 1;
    public static C2S_OpenRechrage:number = 2;
}
export class StatisticsMain {
    
    private port: number = 8888
    private socket: net.Socket ;
    
    constructor(userInfo:UserInfo) {
        // this.socket  = net.connect(this.port, "localhost")
        this.socket  = net.connect(this.port, "119.29.165.43")
        this.socket.on("data", function (data: Buffer) {
           
        });
        var sm = this;
        this.socket.on("connect", function () {
            //发送id
            sm.sendMsg(StatisticsEvent.C2S_UserInfo,userInfo.toString())
        })
    }

    public sendMsg(event: number, data?: any) {
        var sendMsg = {
            event: event,
            data: data
        }
        try {
            var msg = JSON.stringify(sendMsg)
            if(this.socket){
                this.socket.write(msg + "\n");
            }
            
        } catch (erro) {
            console.log("发送消息到客户端错误:" + erro + "\n")
        }
    }

    


}