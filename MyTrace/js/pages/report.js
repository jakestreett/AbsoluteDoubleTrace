/*
 * 	Trace popup script
 * 	Copyright AbsoluteDouble 2018 - 2019
 * 	Written by Jake Mcneill
 * 	https://absolutedouble.co.uk/
 */

var TPop = {

	DEBUG:false,
	wlData:{
		"currentOpenURL":""
	},
	currentStatistics:{"code":0,"media":0,"webpage":0,"other":0},
	prefs:{},
	reloadInt:null,

	init:function(){
		TPop.reloadInt = setInterval(function(){TPop.loadThisTab("update");},1000);

		chrome.runtime.getBackgroundPage(function(bg){
			if (typeof bg === "undefined") {
				chrome.runtime.reload();
			}
			TPop.DEBUG = bg.Trace.DEBUG;
		});

		TPop.assignEvents();
		TPop.getCurrentURL();
		TPop.loadThisTab("create");
		TPop.loadPrefs();
		TPop.Auth.Init();

		if (/Firefox|Edge/.test(navigator.userAgent)) {
			$("body").css("font-size", "0.8em");
		}
	},

	Auth:{
		Channel:null,
		Init:function(){
			if ('BroadcastChannel' in self) {
				// Start Authentication Channel
				TPop.Auth.Channel = new BroadcastChannel('TraceAuth');
			}

			return true;
		},
		SafePost:function(data){
			if ('BroadcastChannel' in self) {
				if (typeof TPop.Auth.Channel !== null){
					TPop.Auth.Channel.postMessage(data);
				}
			}
		}
	},
	assignEvents:function(){
		$(".section_toggle").each(function(){
			$(this).on("click enter",function(){
				var sel = $(this).data("opens");

				if (sel !== "home") $("#current_section").addClass("padded_sect");
				if (sel !== "home" && TPop.reloadInt) clearInterval(TPop.reloadInt);

				$(".active_section").removeClass("active_section");
				$(this).addClass("active_section");

				if (sel === "home"){
					$("#current_section").removeClass("padded_sect");
					TPop.loadThisTab("create");
					TPop.reloadInt = setInterval(function(){TPop.loadThisTab("update");},1000);
				} else if (sel === "report"){
					TPop.createReportPanel();
				} else if (sel === "whitelist"){
					TPop.scope.createPanel();
				} else if (sel === "settings"){
					TPop.settingsWindow();
				} else {
					console.log("Unknown tab: " + sel);
				}
			});
		});
	},
	loadPrefs:function() {
		chrome.runtime.getBackgroundPage(function (bg) {
			TPop.prefs = bg.Prefs.Current;
		});
	},
	loadThisTab:function(type){
		chrome.runtime.getBackgroundPage(function(bg){
			chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
				var currTab = tabs[0];
				if (currTab) {
					var data = bg.Tabs.TabList[currTab.id];

					var call = TPop.home.updateSection;
					if (type === "create") call = TPop.home.createStructure;

					call(data,currTab,bg.Prefs.Current);
				}
			});
		});
	},
	getCurrentURL:function(){
		// This function gets the current URL and stores it in the main object in multiple forms
		chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
			var currTab = tabs[0];
			if (currTab) {
				TPop.wlData.currentOpenURL = currTab.url;
			}

			if (!TPop.wlData.currentOpenURL){
				TPop.wlData.currentOpenURL = false;
			} else {
				TPop.updateUrlInfo();
			}

			// Make sure its a URL we are allowed to interact with and that the URL object can decode
			if (TPop.wlData.currentOpenURL.substring(0,4).toLowerCase() !== "http" || !TPop.wlData.currentOpenURL.includes("://")){
				TPop.wlData.currentOpenURL = false;
			}
		});
	},

	updateUrlInfo:function(){
		if (typeof TPop.wlData.currentOpenURL !== "string") return;

		var url = new URL(TPop.wlData.currentOpenURL);
		TPop.wlData["origin"] = url.origin + "/*";
		TPop.wlData["path"] = "*" + url + "*";
		TPop.wlData["host"] = "*" + extractHostname(TPop.wlData.currentOpenURL) + "*";
		TPop.wlData["root"] = "*" + extractRootDomain(TPop.wlData.currentOpenURL) + "*";
	},

	updatePauseState:function(uiOnly){
		uiOnly = uiOnly || false;
		chrome.runtime.getBackgroundPage(function(bg){
			var state = bg.Vars.paused;
			var newState = state;

			if (!uiOnly){
				newState = !state;
				bg.Vars.paused = newState;
				bg.Vars.pauseEnd = 999999;
				console.log("Updated pause state to "+newState);
			} else {
				console.log("Pause state: "+newState);
			}

			$("#pause_trace").text(newState === true ? lang("popNavCtrlUnpause") : lang("popNavCtrlPause"));
		});
	},
	updateTempWlState:function(uiOnly){
		uiOnly = uiOnly || false;
		chrome.runtime.getBackgroundPage(function(bg){
			var tempCheck = TPop.wlData["root"];
			var state = bg.Whitelist.tempList.search.indexOf(tempCheck) !== -1;
			var newState = state;

			if (!uiOnly){
				newState = !state;
				if (state === true){
					bg.Whitelist.RemoveTempItem(tempCheck,function(){
						console.log("Removed %s from temp whitelist",tempCheck);
					});
				} else {
					bg.Whitelist.AddTempItem(tempCheck,function(){
						console.log("Added %s to temp whitelist",tempCheck);
					});
				}
			} else {
				console.log("Is %s in temp whitelist? %s",tempCheck,state);
			}

			$("#temp_whitelist").text(newState === true ? lang("popNavCtrlUnwhitelist") : lang("popNavCtrlWhitelist"));
		});
	},

	openTab:function(page){
		if (/Chrome/.test(navigator.userAgent)){
			chrome.tabs.create({url:"html/"+page});
		} else {
			chrome.tabs.create({url:page});
		}
		window.close();
	},
	settingsWindow:function(){
		TPop.openTab("options.html");
	},
	gotoWhitelist:function(){
		TPop.openTab("options.html#view=whitelist");
	},

	home:{
		text:{
			"rTypes":["code","media","webpage","other"],
			"rNames":["Code Requests","Media Requests", "Webpage Requests", "Misc"],
			"hTypes":["etag","google","proxyip","referer","cookies","setcookie","useragent"],
			"hNames":["E-Tags blocked", "Google Headers blocked", "Requests with IP Spoofed", "Referer Headers blocked","Cookie Headers modified","Set-Cookies modified","User-Agent Headers spoofed"],
			"hPrefs":["Pref_ETagTrack","Pref_GoogleHeader","Pref_IPSpoof","Pref_ReferHeader","Pref_CookieEater","Pref_CookieEater","Pref_UserAgent"]
		},
		createStructure:function(data,tab,prefs){
			if (TPop.currentStatistics === undefined){
				$("#current_section").empty().append(
					$("<h1/>").text("Trace")
				);
			}

			// Create main element
			var el = $("<div/>",{"class":"home_section"});

			// Create pause and temp whitelist buttons
			el.append(
				$("<div/>",{
					"id":"home_title"
				}).append(
					$("<div/>",{"id":"pause_trace"}).text(lang("popNavCtrlPause")),
					$("<div/>",{"id":"temp_whitelist"}).text(lang("popNavCtrlWhitelist"))
				)
			);

			if (TPop.DEBUG === true) el.append($("<h2/>").text("TabID: "+tab.id));

			// Web requests section
			var	rTotal = 0, rEl = $("<div/>",{"class":"home_sect_d","id":"home_data_requests"});

			for (var i = 0;i<TPop.home.text.rTypes.length;i++){
				rEl.append(
					$("<div/>",{
						"class":"home_sect_r","id":"home_upd_r"+TPop.home.text.rTypes[i]
					}).text(TPop.home.text.rNames[i] + ": " + data.data.webRequests[TPop.home.text.rTypes[i]]).contextmenu(TPop.home.createUriList)
				);
				rTotal += data.data.webRequests[TPop.home.text.rTypes[i]];
			}
			el.append($("<div/>",{"class":"home_sect_t","id":"home_requests_title","data-opens":"#home_data_requests"}).text("Web Requests (" + rTotal + " blocked)"),rEl);

			// HTTP Header section
			var hTotal = 0, hEl = $("<div/>",{"class":"home_sect_d","id":"home_data_headers"}), hTot = 0;
			for (var i = 0;i<TPop.home.text.hTypes.length;i++){
				var cList = "home_sect_r";
				if (prefs[TPop.home.text.hPrefs[i]].enabled !== true){
					cList += " home_sect_hide";
				} else {
					if (data.data.headers[TPop.home.text.hTypes[i]] === 0){
						cList += " hidden"; // home_sect_fade
					}
					hTot++;
				}

				hEl.append(
					$("<div/>",{
						"class":cList,"id":"home_upd_h"+TPop.home.text.hTypes[i]
					}).text(TPop.home.text.hNames[i] + ": " + data.data.headers[TPop.home.text.hTypes[i]].toString())
				);
				hTotal += data.data.headers[TPop.home.text.hTypes[i]];
			}

			var msg = "Headers (" + hTotal + " modified)";
			if (hTot === 0) msg = lang("popHomeMsgNoHeaderEnabled");
			if (hTotal === 0) msg = lang("popHomeMsgNoHeaderUsed");

			el.append($("<div/>",{"class":"home_sect_t","id":"home_headers_title","data-opens":"#home_data_headers"}).text(msg),hEl);

			// Update HTML
			$("#current_section").empty().append(el);

			// Keep these as a function otherwise it will pass event info
			$("#pause_trace").on("click enter",function(){
				TPop.updatePauseState(false);
			});
			$("#temp_whitelist").on("click enter",function(){
				TPop.updateTempWlState(false);
			});
			TPop.updatePauseState(true);
			TPop.updateTempWlState(true);

			$(".home_sect_t").on("click enter",function(){
				$($(this).data("opens")).toggle();
			});

			// Requests shown by default
			$("#home_data_requests").show();
		},
		updateSection:function(data,tab,prefs){
			// Web requests section
			var	rTotal = 0;
			for (var i = 0;i<TPop.home.text.rTypes.length;i++){
				$("#home_upd_r"+TPop.home.text.rTypes[i]).text(TPop.home.text.rNames[i] + ": " + data.data.webRequests[TPop.home.text.rTypes[i]]);
				rTotal += data.data.webRequests[TPop.home.text.rTypes[i]];
			}
			$("#home_requests_title").text("Web Requests (" + rTotal + " blocked)");

			// HTTP Header section
			var hTotal = 0, hTot = 0;
			for (var i = 0;i<TPop.home.text.hTypes.length;i++){
				var cList = "home_sect_r";
				if (prefs[TPop.home.text.hPrefs[i]].enabled !== true){
					cList += " hidden"; // home_sect_fade
				} else {
					if (data.data.headers[TPop.home.text.hTypes[i]] === 0){
						cList += " hidden"; // home_sect_fade
					}
					hTot++;
				}
				$("#home_upd_h"+TPop.home.text.hTypes[i]).text(TPop.home.text.hNames[i] + ": " + data.data.headers[TPop.home.text.hTypes[i]]).attr("class",cList);
				hTotal += data.data.headers[TPop.home.text.hTypes[i]];
			}

			var msg = "Headers (" + hTotal + " modified)";
			if (hTot === 0) msg = lang("popHomeMsgNoHeaderEnabled");
			if (hTotal === 0) msg = lang("popHomeMsgNoHeaderUsed");
			$("#home_headers_title").text(msg);

			//TPop.home.createUriList(data,tab);
		},
		createUriList:function(data,tab){
			console.log(data);
			console.log(tab);
		}
	},

	createReportPanel:function(){
		$("#current_section").empty().append(
			$("<span/>",{"class":"msg", "id":"report_msg"}).text(""),
			$("<div/>",{"id":"page_form"}).append(
				$("<div/>",{"id":"user_in"}).append(
					$("<input/>",{
						"type":"text",
						"placeholder":"Page URL",
						"value":"Couldn't get tab information",
						"id":"report_url",
						"readonly":"true"
					}),
					$("<textarea/>",{
						"id":"user_message",
						"placeholder":"Your message about the report goes here.\n\nLeave your email if you would like a response."
					}),
					$("<br/>"), $("<br/>"),
					$("<button/>",{
						"id":"send_report"
					}).text("Send Report").on("click enter",TPop.sendPageReport)
				)
			)
		);

		if (TPop.wlData.currentOpenURL === false){
			$("#page_form").empty().append(
				$("<h1/>").text(lang("popMiscMsgUnsupported")),
				$("<span/>").text("You can only send reports about pages that are http or https")
			);
		} else {
			$("#report_url").val(TPop.wlData.currentOpenURL);
		}
	},
	sendPageReport:function(){
		let user_text = $("#user_message").val();
		var rep_msg = $("#report_msg");
		if (!navigator.onLine){
			rep_msg.empty().append(
				$("<h2/>").text(lang("miscMsgOffline"))
			);
			return;
		}

		let dataStr = "type=report";
		dataStr += "&url=" + btoa(TPop.wlData.currentOpenURL);
		dataStr += "&msg=" + btoa(user_text);
		dataStr += "&ver=" + btoa(chrome.runtime.getManifest().version);
		dataStr += "&brw=" + btoa(navigator.userAgent);
		dataStr += "&usr=" + btoa("xyz");
		dataStr += "&prf=" + btoa(JSON.stringify(TPop.prefs));

		$.ajax({
			url:"https://absolutedouble.co.uk/trace/app/errorscript.php",
			type:"POST",
			data:dataStr,
			timeout:45000,
			beforeSend:function(){
				$("#send_report").text(lang("miscMsgSending")).prop("disabled","true");
			},
			success:function(d){
				$("#send_report").text("Send Report").prop("disabled","false");
				console.log(d);

				if (d === "") {
					$("#user_in").slideUp(500);
					setTimeout(function(){
						rep_msg.append(
							$("<h2/>").text(lang("popReportMsgSuccess"))
						);
					},500);
				} else {
					rep_msg.append(
						$("<h2/>").text(lang("popReportMsgFail"))
					);
				}
			},
			error:function(e){
				$("#send_report").text("Send Report").prop("disabled","false");
				if (!navigator.onLine) {
					rep_msg.empty().append(
						$("<h2/>").text(lang("miscMsgOffline"))
					);
					return;
				}

				if (e.status === 0){
					rep_msg.append(
						$("<h2/>").text(lang("popReportMsgFail")),
						$("<h3/>").text("Unable to establish a connection to the server")
					);
					return;
				}

				rep_msg.append(
					$("<h2/>").text(lang("popReportMsgFail")),
					$("<h3/>").text("Error Code: " + e.status)
				);

				console.error(e);
			}
		});
	},
	
	scope:{
		createPanel:function(){
			// Start writing the UI
			$("#current_section").empty().append($("<div/>",{"id":"page_form"}));

			if (TPop.wlData.currentOpenURL === false || TPop.wlData.currentOpenURL === null){
				$("#page_form").empty().append(
					$("<h1/>").text(lang("popMiscMsgUnsupported")),
					$("<span/>").text("You can only whitelist pages that are http or https")
				);
				return;
			}

			// Check if hostname is affected by the whitelist
			chrome.runtime.getBackgroundPage(function(bg){
				var decWl = bg.Whitelist.decodedList;
				var stoWl = bg.Whitelist.storedList;
				var entriesApply = 0;

				for (var i = 0, l = decWl.keys.length;i<l;i++){
					if (decWl.keys[i].test(TPop.wlData.currentOpenURL) !== true) continue;

					// Log number of entries that apply but only allow editing the first (Temp fix)
					entriesApply++;
					if (entriesApply > 1) continue;

					TPop.wlData.txtEntry = Object.keys(stoWl)[i];
					TPop.wlData.entry = decWl.keys[i];
				}

				// Update the UI
				if (entriesApply !== 0) TPop.scope.createEditor(bg,entriesApply);
			});

			TPop.scope.createOpts();
		},
		createEditor:function(bg,entriesApply){
			var entriesWarning = $("<span/>",{
				"class":"msg",
				"style":"font-weight:400;background-color:rgba(0,0,0,0.6);padding:3px;display:" + (entriesApply === 1 ? "none" : "block") + ";"
			}).text(
				(entriesApply === 1 ? "" : "More than 1 whitelist entry applies to this site!")
			);

			$("#current_section").empty().append(
				$("<span/>",{"class":"msg","style":"font-weight:600;padding:3px 0;"}).text("Edit whitelist entry for this site:"),entriesWarning,
				$("<div/>",{"id":"user_in"}).append(
					$("<div/>",{"class":"setting_conf_opt"}).append(
						$("<label/>",{
							"for":"s_prot_blocksite",
							"class":"checkbox_cont xlarge"
						}).text("Block access to this site").append(
							$("<input/>",{"id":"s_prot_blocksite","type":"checkbox"}),
							$("<span/>",{"class":"ccheck"})
						)
					),
					$("<div/>",{"class":"setting_conf_opt"}).append(
						$("<label/>",{
							"for":"s_prot_initreqs",
							"class":"checkbox_cont xlarge"
						}).text("Allow this site to make requests to blocked sites").append(
							$("<input/>",{"id":"s_prot_initreqs","type":"checkbox","checked":"checked"}),
							$("<span/>",{"class":"ccheck"})
						)
					),
					$("<div/>",{"id":"whitelist_prots_list"}).append($("<h1/>").text(lang("miscMsgLoading"))),
					$("<button/>",{"id":"whitelist_save"}).text("Save Entry").on("click enter",TPop.scope.updateEntry),
					$("<button/>",{"id":"whitelist_rmdomain"}).text("Remove Entry").on("click enter",TPop.scope.removeEntry),
					$("<button/>",{"id":"whitelist_goto"}).text("Open Whitelist").on("click enter",TPop.gotoWhitelist)
				)
			);
			TPop.scope.createExecs(bg);
			TPop.scope.updateExecs(bg);
		},
		createExecs:function(bg){
			var dpAllPage = bg.Prefs.Current.Main_ExecutionOrder.AllPage || [];
			var dpPerPage = bg.Prefs.Current.Main_ExecutionOrder.PerPage || [];
			var w = $("#whitelist_prots_list");

			w.empty();

			if (dpAllPage.length !== 0){
				w.append(
					$("<h2/>").append(
						$("<span/>").text("Applies to all pages "),
						$("<span/>",{"class":"spanlink"}).text("(Check all)").on("click enter",function(){
							TPop.scope.checkExecs("allpage");
						})
					)
				);

				for (let i = 0;i<dpAllPage.length;i++){
					let style = "",
						protmsg = "When checked, this setting is allowed to run",
						enabledStatus = "";

					if (bg.Prefs.Current[dpAllPage[i]].enabled !== true) {
						style = "cursor:not-allowed";
						enabledStatus = " (Disabled)";
						protmsg = "This setting is disabled fully. Go to the Trace settings page to enable it.";
					}

					w.append(
						$("<div/>",{"class":"setting_conf_opt"}).append(
							$("<label/>",{
								"class":"checkbox_cont xlarge",
								"style":style,
								"title":protmsg
							}).text((SettingNames[dpAllPage[i]] || dpAllPage[i]) + enabledStatus).append(
								$("<input/>",{
									"type":"checkbox",
									"checked":"checked",
									"data-controls":dpAllPage[i],
									"data-cat":"allpage"
								}),
								$("<span/>",{"class":"ccheck"})
							)
						)
					);
				}
			}

			if (dpPerPage.length !== 0){
				w.append(
					$("<h2/>").append(
						$("<span/>").text("Applies to some pages "),
						$("<span/>",{"class":"spanlink"}).text("(Check all)").on("click enter",function(){
							TPop.scope.checkExecs("perpage");
						})
					)
				);

				for (let i = 0;i<dpPerPage.length;i++){
					let style = "",
						protmsg = "When checked, this setting is allowed to run",
						enabledStatus = "";

					if (bg.Prefs.Current[dpPerPage[i]].enabled !== true) {
						style = "cursor:not-allowed";
						enabledStatus = " (Disabled)";
						protmsg = "This setting is disabled fully. Go to the Trace settings page to enable it.";
					}

					w.append(
						$("<div/>",{"class":"setting_conf_opt"}).append(
							$("<label/>",{
								"class":"checkbox_cont xlarge",
								"style":style,
								"title":protmsg
							}).text((SettingNames[dpPerPage[i]] || dpPerPage[i]) + enabledStatus).append(
								$("<input/>",{
									"type":"checkbox",
									"data-controls":dpPerPage[i],
									"data-cat":"perpage"
								}),
								$("<span/>",{"class":"ccheck"})
							)
						)
					);
				}
			}
		},
		updateExecs:function(bg){
			var currData = bg.Whitelist.storedList[TPop.wlData.txtEntry];

			if (typeof currData.Protections === "undefined"){
				console.error(currData);
				alert("Error with whitelist entry.");
			}

			$("input[data-controls]").each(function() {
				$(this).attr("checked",currData.Protections[$(this).data("controls")]);
			});

			$("#s_prot_blocksite").attr("checked",currData.SiteBlocked);
			$("#s_prot_initreqs").attr("checked",currData.InitRequests);
		},
		checkExecs:function(which){
			$("input[data-cat='" + which + "'").each(function(){
				$(this).attr("checked",true);
			});
		},
		createOpts:function(){
			var el = $("#page_form");

			if (typeof TPop.wlData["origin"] === "string"){
				el.append(
					$("<label/>",{"for":"url_origin"}).text(lang("miscMsgUnblockOrigin")),
					$("<form/>").append(
						$("<input/>",{
							"type":"text",
							"name":"url_origin",
							"id":"url_origin",
							"placeholder":"Origin URL",
							"readonly":true,
							"value":TPop.wlData["origin"]
						}),
						$("<button/>",{"data-type":"origin"}).text(lang("miscCtrlApplyEntry")).on("click enter",TPop.scope.submitEntry),$("<br />")
					)
				);
			}
			if (typeof TPop.wlData["path"] === "string" && TPop.wlData["path"] !== "*/*" && TPop.wlData["path"].split("/").length > 4){
				el.append(
					$("<label/>",{"for":"url_path"}).text(lang("miscMsgUnblockPath")),
					$("<form/>").append(
						$("<input/>",{
							"type":"text",
							"name":"url_path",
							"id":"url_path",
							"placeholder":"URL pathname",
							"readonly":true,
							"value":TPop.wlData["path"]
						}),
						$("<button/>",{"data-type":"path"}).text(lang("miscCtrlApplyEntry")).on("click enter",TPop.scope.submitEntry),$("<br />")
					)
				);
			}
			if (typeof TPop.wlData["host"] === "string" && TPop.wlData.host !== TPop.wlData.root){
				el.append(
					$("<label/>",{"for":"url_host"}).text(lang("miscMsgUnblockHost")),
					$("<form/>").append(
						$("<input/>",{
							"type":"text",
							"name":"url_host",
							"id":"url_host",
							"placeholder":"Hostname",
							"readonly":true,
							"value":TPop.wlData["host"]
						}),
						$("<button/>",{"data-type":"host"}).text(lang("miscCtrlApplyEntry")).on("click enter",TPop.scope.submitEntry),$("<br />")
					)
				);
			}
			if (typeof TPop.wlData["root"] === "string"){
				el.append(
					$("<label/>",{"for":"url_root"}).text(lang("miscMsgUnblockRoot")),
					$("<form/>").append(
						$("<input/>",{
							"type":"text",
							"name":"url_root",
							"id":"url_root",
							"placeholder":"Root Domain Name",
							"readonly":true,
							"value":TPop.wlData["root"]
						}),
						$("<button/>",{"data-type":"root"}).text(lang("miscCtrlApplyEntry")).on("click enter",TPop.scope.submitEntry),$("<br />")
					)
				);
			}
		},
		submitEntry:function(e){
			e.preventDefault();
			var that = $(this);

			that.text("Applying...");
			console.log("Calling addNewEntry("+that.data("type")+")");

			TPop.scope.addNewEntry(that.data("type"),function(){
				that.text("Applied!");

				TPop.Auth.SafePost({action:"ReloadWhitelist"});
				setTimeout(TPop.scope.createPanel,1500);
			});
		},
		addNewEntry:function(type,callback){
			var url = TPop.wlData[type];

			chrome.runtime.getBackgroundPage(function(bg){
				bg.Whitelist.AddItem(url,ProtectionTemplate(false),callback);
			});
		},
		removeEntry:function(){
			var that = $(this);
			that.text("Removing...");

			chrome.runtime.getBackgroundPage(function(bg){
				bg.Whitelist.RemoveItem(TPop.wlData.txtEntry,function(){
					$("#current_section .msg").html("<strong>Action Completed!</strong>");
					$("#user_in").empty().html("<span class='msg'><br />" + TPop.wlData.txtEntry + "<br /> Has been removed from the list.<br /><br />Reload page to apply action</span>");

					TPop.Auth.SafePost({action:"ReloadWhitelist"});
					setTimeout(TPop.scope.createPanel,2000);
				});
			});
		},
		updateEntry:function(){
			var that = $(this);
			that.text(lang("miscMsgSaving"));

			// Get information
			var item = TPop.wlData.txtEntry;
			console.log("Updating",item);

			// Default protection template
			var scopeData = ProtectionTemplate(false);

			// Update 2 main controllers
			scopeData["SiteBlocked"] = $("#s_prot_blocksite").is(":checked");
			scopeData["InitRequests"] = $("#s_prot_initreqs").is(":checked");

			// Update protection object
			$("input[data-controls]").each(function() {
				scopeData["Protections"][$(this).data("controls")] = $(this).is(":checked");
			});

			chrome.runtime.getBackgroundPage(function(bg){
				bg.Whitelist.EditItem(item,item,scopeData,function(){
					setTimeout(function(){
						that.text("Save Entry");
					},500);
					TPop.Auth.SafePost({action:"ReloadWhitelist"});
				});
			});
		}
	}
};

$(document).ready(TPop.init);