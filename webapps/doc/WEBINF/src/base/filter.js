/*
 * @packet base.filter; 
 */
Module({
    name: "logfilter",
    extend: "filter",
    doFilter: function (data, next) {
        console.log("----filter----");
        next(data);
    }
});