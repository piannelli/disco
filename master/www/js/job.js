$(document).ready(function(){
    var job = new Job(document.location.search.substr(6));
    //$("#hd #title").append(job.name);
    $("#kill_job").click(job.kill);
    $("#purge_job").click(job.purge);
    //$("#find_page").click(job.find);
    //$("#find_events").submit(job.find);
});

function repeat(func, every, until){
    if (until && until.call())
        return;
    func.call();
    setTimeout(function(){ repeat(func, every, until); }, every);
}

function show_jobs(){
    document.location.href = "/job.html";
}

function Job(name){
    var self = this; /* cant actually use 'this' in methods since jquery binds it */
    self.name = name;

   /* $("#disco_busy").hide();
    $("#disco_no_jobs").hide();
  */
    self.purge = function(){
        if (confirm("Do you really want to delete all data of " + self.name + "?"))
            post_req("/disco/ctrl/purge_job", JSON.stringify(self.name), show_jobs);
    }

    self.find = function(){
        self.request_events();
        return false;
    }

    self.isactive = function(){
        return self.status == "active";
    }

    self.request_events = function(){
        $.getJSON("/disco/ctrl/jobevents", {name: self.name,
                                            num: 100,
                                            filter: $("#pagesearch").val()},
                  self.update_events);
    }

    self.request_info = function(){
        $.getJSON("/disco/ctrl/jobinfo", {name: self.name}, self.update_info);
    }

    self.update_info = function(data){
        $("#disco_job_details").removeClass("hidden");
        self.status = data.active;
        self.started = data.timestamp;
        self.owner = data.owner;
        var jobMapStatuses = ['job_map_waiting', 'job_map_running', 'job_map_done', 'job_map_failed'];
        var jobReduceStatuses = ['job_reduce_waiting', 'job_reduce_running', 'job_reduce_done', 'job_reduce_failed'];
        $("#nfo_status").text(self.status);
        $("#job_name").text(self.name);
        $("#job_started_at").text(self.started);
        $("#job_started_by").text(self.owner);

        $.each(jobMapStatuses, function(i, val) {
            if (data.mapi[i] > 0){
                $('#'+ val).parent().removeClass("hidden");
                $('#'+ val).text(data.mapi[i]);
            } else {
                $('#'+ val).parent().addClass("hidden");
            }
        });
        $.each(jobReduceStatuses, function(i, val) {
            if (data.mapi[i] > 0){
                $('#'+ val).parent().removeClass("hidden");
                $('#'+ val).text(data.redi[i]);
            } else {
                $('#'+ val).parent().addClass("hidden");
            }
        });

        $("#nfo_map").html(make_jobinfo_row(data.mapi, "Map"));
        $("#nfo_red").html(make_jobinfo_row(data.redi, "Reduce"));

        if (data.inputs.length >= 100) {
            $("#map_inputs").html("Showing the first 100 inputs<br/>" +
                                  prepare_urls(data.inputs.slice(0, 100)));
        } else {
            $("#map_inputs").html(prepare_urls(data.inputs));
        }

        if (data.results.length) {
            $("#results").html(prepare_urls(data.results));
            $("#results").children().removeClass("alert-info").addClass("alert-success");
        }

        $(".url:odd").css({"background": "#eee"});

        var statusClass;

        if (self.status == "active") { statusClass = "label label-success" }
        if (self.status == "dead") { statusClass = "label label-important" }

        $("#job_status").removeAttr("class");
        $("#job_status").addClass(statusClass);
        $("#job_status").html(self.status.toUpperCase());

        if (self.status == "active") {
            $("#kill_job").removeClass("hidden");
        }

        self.request_events();
    }

    self.update_events = function(events){
        $(".events").html($.map(events, make_event));
        $(".event .node").click(click_node);
    }

    self.kill = function(){
        if (confirm("Do you really want to kill " + self.name + "?")) {
            post_req("/disco/ctrl/kill_job", JSON.stringify(self.name));
            self.request_info();
            start_joblist();
            $("#kill_job").addClass('hidden');
        }            
    }

    repeat(self.request_info, 10000);
    if (self.name) {
        $("#disco_busy").hide();
        $("#disco_no_jobs").hide();
    }
}

function make_jobinfo_row(dlist, mode){
    return $.map([mode].concat(dlist), function(X, i){
        if (X == mode)
            return $.create("td", {"class":"title"}, [X]);
        else
            return $.create("td", {}, [String(X)]);
    });
}

function prepare_urls(lst){
    return $.map(lst, function(X, i){
        var t = "";
        if (typeof(X) == "string")
            t = X;
        else {
            X.reverse();
            t = X.shift();
            if (X.length)
                for (i in X)
                    t += "<div class='redundant'>(" + X[i] + ")</div>";
        }
        return "<div class='url'>" + t + "</div>";
    }).join("");
}

function click_node(){
    if ($(this).attr("locked")) {
        $(".event").show();
        $(".event .node:contains(" + $(this).text() + ")")
            .removeAttr("locked")
            .removeClass("locked");
    } else {
        $(".event").hide();
        $(".event .node:contains(" + $(this).text() + ")")
            .attr({"locked": true})
            .addClass("locked")
            .parent(".event").show();
    }
}

function make_event(E, i){
    var tstamp = E[0];
    var host = E[1];
    var msg = E[2];
    var type = (msg.match("^(WARN|ERROR|READY)") || [""])[0].toLowerCase();

    if (type == 'error') { type = 'alert alert-error' }
    if (type == 'warn') { type = 'alert alert-warning' }
    if (type == 'ready') { type = 'alert alert-success' }

    var msg = $.map(msg.split("\n"), function(x, i){
        return $.create("span", {}, [x])
    });

    var body = [$.create("div", {"class": "tstamp-node label label-default"}, [tstamp + ' - From: ' + host]),
                $.create("div", {"class": "text " + type}, msg)];
    return $.create("div", {"class": "event"}, body);
}
