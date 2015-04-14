function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(/[?&#]+([^=&]+)=([^&#]*)/gi, function (m, key, value) {
        vars[key] = decodeURIComponent(value);
    });
    return vars;
}

function make_uri(uri, options) {
    var ops = {};
    $.extend(ops, getUrlVars());
    if (options != null) {
        $.extend(ops, options);
    }
    var str = $.map(ops, function (val, index) {
        return index + "=" + encodeURIComponent(val).toLowerCase();
    }).join("&");

    return (str == "") ? uri : uri + "?" + str;
}

function reload(extra) {
    window.location.search = make_uri ("", extra);
}

function update_url(extra) {
    var ops = {};
    $.extend(ops, getUrlVars ());
    if (extra != null) {
        $.extend(ops, extra);
    }
    window.location.hash = $.map(ops, function (val, index) {
        return val ? (index + "=" + encodeURIComponent(val)) : null;
    }).join("&")
}

function initSingleSelector(selector_id, property, dataSet, update_handler) {
    var values = {};

    for (var i = 0; i < dataSet.length; i++) {
        var element = dataSet[i][property];
	if (element instanceof Array) {
	    for (var key in element)
		values[element[key]] = element[key];
	} else
	    values[element] = element;
    }

    var result = [];
    for (var value in values)
        result.push({"id": value, "text": value});

    $("#" + selector_id).
	val (getUrlVars()[property]).
        on("select2-selecting", function (e) {
            var options = {};
            options[property] = e.val;
            update_url (options);
	    update_handler ();
        }).
        on("select2-removed", function (e) {
            var options = {};
            options[property] = '';
            update_url (options);
	    update_handler ();
        }).
        select2({data: result, allowClear: true});
}

function filterData (tableData, filters) {
    var filteredData = [];

    for (var i = 0; i < tableData.length; i++) {
        var row = tableData[i];
        var filtered = true;

        for (var column in filters) {
	    if (column in row) {
		if (row[column] instanceof Array) {
		    filtered = false;
		    for (var key in row[column])
			if (filters[column] == row[column][key])
			    filtered = true;
		} else {
		    if (filters[column] != row[column])
			filtered = false;
		}
	    }
	    if (filtered == false)
		break;
        }

        if (filtered) {
	    filteredData.push(row);
        }
    }

    return filteredData;
}

function populate_table (table_id, table_column_names, tableData)
{
    var tableColumns = [];
    for (var i = 0; i < table_column_names.length; i++) {
        tableColumns.push({"mData": table_column_names[i]});
    }

    if (table_id) {
        $("#" + table_id).dataTable({
	    "aLengthMenu": [
                [5, 10, 25, 50, -1],
                [5, 10, 25, 50, "All"]
	    ],
	    "bDestroy": true,
	    "iDisplayLength": -1,
	    "bAutoWidth": false,
	    "bPaginate": true,
	    "pagingType": "full_numbers",
	    "aaData": tableData,
	    "aoColumns": tableColumns
        });
    }    
}

function showInfoDialog (tab, info) {
    $("#info-container").empty();
    $("#" + tab + "-info").tmpl(info).appendTo("#info-container");
    $("#info-dialog").dialog("open");
    $("button").focus ();
}

function showInfoPage (tab, info)
{
    $("#info-content").empty();
    $("#" + tab + "-info").tmpl(info).appendTo("#info-content");
    $( ".content" ).hide ();
    $( "#info-page" ).show ();
    update_url ({ tab : tab, asset : info.name});
}

function setupInfoHandler (tab, element_id, info) {
    info.name_html = "<a id=\"" + tab +"-" + element_id + "\" href=\"#\" title=\"Show details\">" + info.name + "</a>";

    $("#" + tab + "-table").on("click", "#" + tab + "-" + element_id, function (event) {
        event.preventDefault();
        event.stopPropagation();

        showInfoPage (tab, info);
    });
}

var glance_images = { images: [] };

function show_glance_images ()
{
    populate_table ("glance-images-table",
		    ["name_html", "description", "format", "supported_by", "license"],
		    filterData (glance_images["images"], getUrlVars ()));
}

var heat_templates = { templates: [] };

function show_heat_templates ()
{
    populate_table ("heat-templates-table",
		    ["name_html", "description", "release_html", "format", "supported_by", "license"],
		    filterData (heat_templates["templates"], getUrlVars ()));
}

var murano_apps = { applications: [] };

function show_murano_apps ()
{
    populate_table ("murano-apps-table",
		    ["name_html", "description", "release_html", "format", "supported_by", "license"],
		    filterData (murano_apps["applications"], getUrlVars ()));
}

function initTabs ()
{
    $( "ul.nav > li > a" ).on("click", function (event) {
        event.preventDefault ();
    });
    $( "ul.nav > li" ).on("click", function (event) {
	update_url ({ tab : this.children[0].hash.substring (1), asset: "" });
    });
}

function show_asset (tab, tableData)
{
    var options = getUrlVars ();
    if ((tab == options["tab"]) && ("asset" in options)) {
	for (var i = 0; i < tableData.length; ++i)
	    if (tableData[i].name == options["asset"]) {
		showInfoPage (tab, tableData[i]);
	    }
    }
}

function initMarketPlace ()
{
    navigate ();
    initTabs ();
    $( ".inner" ).matchHeight ();
    
    $("#info-dialog").dialog({
        autoOpen: false,
        width: "70%",
        modal: true,
        buttons: {
            Close: function () {
                $(this).dialog("close");
            }
        },
        close: function () { }
    });

    $.ajax({
        url: make_uri("static/glance_images.json"),
        dataType: "json",

        success: function (data) {
	    glance_images = data;
	    var tableData = glance_images["images"];
	    for (var i = 0; i < tableData.length; i++) {
		tableData[i].name = tableData[i].image_name;
		setupInfoHandler ("glance-images", i, tableData[i]);
	    }
	    
	    initSingleSelector ("glance-supported-by", "supported_by", tableData, show_glance_images);
	    show_asset ("glance-images", tableData);
	    show_glance_images ();
        }
    });      

    $.ajax({
        url: make_uri("static/heat_templates.json"),
        dataType: "json",

        success: function (data) {
	    heat_templates = data;
	    var tableData = heat_templates["templates"];
	    for (var i = 0; i < tableData.length; i++) {
		tableData[i].release_html = tableData[i].release.join (", ");
		tableData[i].name = tableData[i].template_name;
		setupInfoHandler ("heat-templates", i, tableData[i]);
	    }
	    
	    initSingleSelector ("heat-supported-by", "supported_by", tableData, show_heat_templates);
	    initSingleSelector ("heat-release", "release", tableData, show_heat_templates);
	    
	    show_asset ("heat-templates", tableData);
	    show_heat_templates ();
        }
    });      

    $.ajax({
        url: make_uri("static/murano_apps.json"),
        dataType: "json",

        success: function (data) {
	    murano_apps = data;
	    var tableData = murano_apps["applications"];
	    for (var i = 0; i < tableData.length; i++) {
		tableData[i].release_html = tableData[i].release.join (", ");
		tableData[i].name = tableData[i].application_name;
		setupInfoHandler ("murano-apps", i, tableData[i]);
	    }
	    
	    initSingleSelector ("murano-supported-by", "supported_by", tableData, show_murano_apps);
	    initSingleSelector ("murano-release", "release", tableData, show_murano_apps);
	    show_asset ("murano-apps", tableData);
	    show_murano_apps ();
        }
    });
}

function navigate ()
{
    var tabs_list = $("#navbar")[0].children;
    var selected_tab_name = null;
    var options = getUrlVars ();
    
    $( "ul.nav > li" ).removeClass ("active");
    if ("tab" in options) {
        for (var i = 0; i < tabs_list.length; ++i) {
	    var tab_name = tabs_list[i].children[0].hash.substring (1);
	    if (tab_name == options["tab"]) {
		selected_tab_name = tab_name;
		if (!("asset" in options)) 
		    tabs_list[i].className = "active";
		break;
	    }
	}
    }
    
    $( ".content" ).hide ();
    
    if (selected_tab_name == null) {
	$( "#landing-page" ).show ();
    } else if ("asset" in options) {
	show_asset ("murano-apps", murano_apps["applications"]);
	show_asset ("heat-templates", heat_templates["templates"]);
	show_asset ("glance-images", glance_images["images"]);
    } else {
	$( "#" + selected_tab_name ).show ();
    }
} 

window.onhashchange = navigate