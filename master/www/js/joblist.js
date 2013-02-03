function job_mouseover(){
    $(this).css('background', '#FFF7BF');
    $("._job_" + $(this).text().replace("@", "_").split(":").join(""))
        .addClass("show_jbox");
}

function job_mouseout(){
    $(this).css('background', '#FFF');
    $(".show_jbox").removeClass("show_jbox");
}

function filter_jobs(txt){
    $(".job").css("display", "none");
    $(".job:contains('" + txt + "')").css("display", "block");
}

function start_joblist(){
    var options = {callback: filter_jobs,
                   wait: 500,
                   highlight: true,
                   enterkey: true}
    $("#joblist input").typeWatch(options);
    $.getJSON("/disco/ctrl/joblist", update_joblist);
}

function update_joblist(jobs){
	update_joblist_type(jobs, 'active', 'Running');
	update_joblist_type(jobs, 'dead',   'Failed');
	update_joblist_type(jobs, 'ready',  'Completed');
	
	$('#select_a_job').hide();

	if (jobs.length) {
		$('#select_a_job').show();
	}
	
    //filter_jobs($("#jobsearch input").val());
    setTimeout(function(){
        $.getJSON("/disco/ctrl/joblist", update_joblist);
    }, 10000);
}

function update_joblist_type(jobs, type, label){
	var jobs = $.map(jobs, job_element, type);
	classType = label.toLowerCase();
    $("." + classType + "-jobs").html('<li class="nav-header">'+ (jobs.length ? '' : 'No ') + label +' jobs</li>');
	$("." + classType + "-jobs > li").append(jobs);
	
	if (type == 'active') {
	    if (jobs.length > 0) {
			$('#disco_no_jobs').fadeOut();
			$('#disco_busy').fadeIn();
		} else if (typeof Job != "undefined" && !Job) {
			$('#disco_busy').fadeOut();
			$('#disco_no_jobs').fadeIn();
		}
	} 
}

function job_element(job, i, status){
    var prio = job[0];        /* [-1.0..1.0] */
    var job_status = job[1];
    var name = job[2];

    if (job_status != status) {
		return;
    }

	ajob = $.create("a", {"href" : "job.html?name=" + name}, [name]);
    jbox = $.create("li", {"class": "job"}, [ajob]);
    //jbox.onmouseover = job_mouseover;
    //jbox.onmouseout = job_mouseout;
    //jbox.onclick = job_click;

    return jbox;
}

$(document).ready(start_joblist);
