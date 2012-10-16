$(document).ready(function(){
    $.getJSON("/disco/ctrl/nodeinfo", update_nodes_data);
    //$.getJSON("/ddfs/ctrl/gc_stats", update_gcstats);
    //$.getJSON("/ddfs/ctrl/gc_status", update_gcstatus);
});

function Node(host, info){
    self = this; /* cant actually use 'this' in methods since jquery binds it */
    self.host = host;
    self.info = info;
    self.id = host.replace(/\./g, "-");

    self.append_to = function(elmt){
        var disconnected = self.info.connected ? "" : " disconnected";
        var diskp = 100 * self.info.diskfree / (self.info.diskfree + self.info.diskused);
        var title = $.create("h5", {"class": " " + disconnected}, [host]);
        var jboxes = $.map(Array(self.info.max_workers), function(X, i){
            return $.create("div", {"class": "label", "id": "free"}, [""]);
        });
        jboxes = $.create("div", {"class":"workers", "id": self.id}, jboxes);
        var disk = $.create("ul", {"class": "nav nav-list clearfix"});        
        $(disk).append($.create("li", {"class": "divider"}));
        var diskused = $(disk).append($.create("li", {"class":"center"},
                                               [format_size(self.info.diskused) + " / " + format_size(self.info.diskfree)]));
                                               
        var blacklisted = self.info.blacklisted ? "blacklisted" : "";
		var blacklistedDisco = $.create("span", {"class": "blacklisted-disco label label-" + ((blacklisted) ? "important" : "success")}, ["Disco"]);
		var blacklistedDDFS = $.create("span", {"class": "blacklisted-ddfs label label-" + ((blacklisted) ? "important" : "success")}, ["DDFS"]);
		var blacklist = $.create("li", {"class":"center"}, [blacklistedDisco, blacklistedDDFS]);
		$(disk).append(blacklist);
        elmt.append($.create("div", {"class": "span2 well host " + blacklisted},
                             [title, jboxes, disk]));
                           
        $.map(self.info.tasks || [], self.show_task);
    }

    self.show_task = function(task){
        $(".workers#" + self.id + " > .label#free:first")
            .attr("id", "")
            .addClass("busy")
            .addClass("_job_" + task.replace("@", "_").split(":").join(""))
            .click(function(){
                $("#joblist input").val(task);
            });
    }
}

function update_nodes_data(data){
    $("#nodes").empty();
    var hosts = [];
    var totalHosts = 0;
    var activeHosts = 0;
    var totalWorkers = 0;
    var activeWorkers = 0;
    var usedDiskSpace = 0;
    var freeDiskSpace = 0;
    var totalDiskSpace = 0;
    for (host in data)
        hosts.push(host);
    hosts.sort();
    totalHosts = hosts.length;
    $.each(hosts, function(i, host){
        new Node(host, data[host]).append_to($("#nodes"));
        totalWorkers += data[host].max_workers;
        if (data[host].connected == true) {
        	activeHosts++;
            activeWorkers += data[host].max_workers;
            freeDiskSpace += data[host].diskfree;
            usedDiskSpace += data[host].diskused;
        }
    });
    
    totalDiskSpace = freeDiskSpace + usedDiskSpace;
    freeDiskSpacePercentage = Math.round((freeDiskSpace * 100) / totalDiskSpace, 2);
    usedDiskSpacePercentage = Math.round((usedDiskSpace * 100) / totalDiskSpace, 2);

    $('#hosts_active_count').html(activeHosts);
    $('#hosts_total_count').html(totalHosts);
	$('#workers_active_count').html(activeWorkers);
	$('#workers_total_count').html(totalWorkers);
	$('#disk_used_count').html(format_size(usedDiskSpace));
	$('#disk_free_count').html(format_size(freeDiskSpace));
	if (usedDiskSpace) {
		$('#disk_used_percentage').html(usedDiskSpacePercentage);
		$('#disk_free_percentage').html(freeDiskSpacePercentage);
		$('#disk_used_percentage').parent('div').css('width', usedDiskSpacePercentage + '%');
		$('#disk_free_percentage').parent('div').css('width', freeDiskSpacePercentage + '%');
	}
	
    setTimeout(function(){
        $.getJSON("/disco/ctrl/nodeinfo", update_nodes_data);
    }, 10000);
}

function update_gcstats(data){
    $("#gcstats").empty();
    if (typeof(data) === "string")
        $("#gcstats").text(data);
    else {
        $("#gcstats").append(String("At: " + data["timestamp"]));
        var thd = $("<thead><tr><td/> <td>Files</td> <td>Bytes</td></tr></thead>");
        var tbd = $.create("tbody", {}, []);
        $.each(data["stats"], function(typ, stats){
            $(tbd).append($.create("tr", {"class": "gcstat"},
                                   [$.create("td", {}, [String(typ)]),
                                    $.create("td", {}, [String(stats[0])]),
                                    $.create("td", {}, [String(format_size(stats[1]/1000))])]));
        });
        $("#gcstats").append($($("<table class='gcstats_table'/>")).append(thd, tbd));
    }

    setTimeout(function(){
        $.getJSON("/ddfs/ctrl/gc_stats", update_gcstats);
    }, 10000);
}

function update_gcstatus(data){
    $("#gcstatus").unbind('click').empty();
    if (data === "")
        $("#gcstatus").append('<a href="#">Start GC</a>').show().click(start_gc);
    else
        $("#gcstatus").text(data);
    setTimeout(function(){
        $.getJSON("/ddfs/ctrl/gc_status", update_gcstatus);
    }, 10000);
}

function start_gc(){
    $.getJSON("/ddfs/ctrl/gc_start", function(resp){
        $("#gcstatus").unbind('click').text(resp).show().fadeOut(2000);
    });
}
