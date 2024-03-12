import moment from "moment";

export class Logger {
    static log(message) {
        console.log(`[INFO] ${moment(new Date()).format("gg/MM/YYYY, hh:mm")} || ${message}`)
    }
    static error(message) {
        console.log(`[ERROR!] ${moment(new Date()).format("gg/MM/YYYY, hh:mm")} || ${message}`)

    }
}