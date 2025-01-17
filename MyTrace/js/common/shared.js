/*
 * 	Trace shared UX utils
 * 	Copyright AbsoluteDouble 2018 - 2019
 * 	Written by Jake Mcneill
 * 	https://absolutedouble.co.uk/
 */

// A general fix for browser that use window.browser instead of window.chrome
if (typeof window.chrome === "undefined" || !window.chrome.hasOwnProperty("extension")) window.chrome = (function (){ return window.msBrowser || window.browser || window.chrome; })();

window.URL = window.URL || window.webkitURL;

// Polyfill: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes#Polyfill
if (!String.prototype.includes) {
	String.prototype.includes = function(search, start) {
		if (typeof start !== 'number') {
			start = 0;
		}

		if (start + search.length > this.length) {
			return false;
		} else {
			return this.indexOf(search, start) !== -1;
		}
	};
}

// Polyfill: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
if (typeof Object.assign !== 'function') {
	Object.defineProperty(Object,"assign",{
		value:function assign(target, varArgs) {
			if (target === null || target === undefined) {
				throw new TypeError('Cannot convert undefined or null to object');
			}

			var to = Object(target);
			for (var index = 1; index < arguments.length; index++) {
				var nextSource = arguments[index];

				if (nextSource !== null && nextSource !== undefined) {
					for (var nextKey in nextSource) {
						if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
							to[nextKey] = nextSource[nextKey];
						}
					}
				}
			}
			return to;
		},
		writable:true,
		configurable:true
	});
}

// Get message for language
var lang = function(msg){
	if (!chrome.i18n) return "";
	return chrome.i18n.getMessage(msg);
};

// Generate a random string of r length
var makeRandomID = function(r){
	for(var n="",t="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",a=0;r > a;a++){
		n += t.charAt(Math.floor(Math.random()*t.length));
	}
	return n;
};

// Get day month and year as strings
var getDateStrings = function(){
	var date = new Date();
	var day = date.getDate();
	var month = date.getMonth()+1;
	day.toString().length !== 2 ? day = "0" + day.toString() : 0;
	month.toString().length !== 2 ? month = "0" + month.toString() : 0;

	return [date.getFullYear().toString(),month.toString(),day.toString()];
};

// Choose a random item from an array
var rA = function(a){
	return a[Math.floor(Math.random() * a.length)];
};

var getToken = function(){
	var randomPool = new Uint8Array(32);
	crypto.getRandomValues(randomPool);
	var hex = '';
	for (var i = 0; i < randomPool.length; ++i) {
		hex += randomPool[i].toString(16);
	}
	return hex;
};

// Thanks to https://stackoverflow.com/a/23945027/
var extractHostname = function(url){
	var hostname;

	if (url.indexOf("://") > -1) {
		hostname = url.split('/')[2];
	} else {
		hostname = url.split('/')[0];
	}

	hostname = hostname.split(':')[0];
	hostname = hostname.split('?')[0];

	return hostname;
};
var extractRootDomain = function(url){
	var domain = extractHostname(url),
		splitArr = domain.split('.'),
		arrLen = splitArr.length;

	if (arrLen > 2) {
		domain = splitArr[arrLen - 2] + '.' + splitArr[arrLen - 1];
		if (splitArr[arrLen - 2].length === 2 && splitArr[arrLen - 1].length === 2) {
			domain = splitArr[arrLen - 3] + '.' + domain;
		}
	}
	return domain;
};

var SettingNames = {
	"Pref_AudioFingerprint":"Audio Fingerprinting Protection",
	"Pref_BatteryApi":"Battery API Protection",
	"Pref_CanvasFingerprint":"Canvas Fingerprinting Protection",
	"Pref_ClientRects":"getClientRects Protection",
	"Pref_CommonTracking":"Common Tracking Protection",
	"Pref_CookieEater":"Cookie Eater",
	"Pref_HardwareSpoof":"Hardware Fingerprinting Protection",
	"Pref_ETagTrack":"E-Tag Tracking Protection",
	"Pref_GoogleHeader":"Google Header Removal",
	"Pref_IPSpoof":"Proxy IP Header Spoofing",
	"Pref_NativeFunctions":"JS functions",
	"Pref_NetworkInformation":"Network Information API",
	"Pref_PingBlock":"Ping Protection",
	"Pref_PluginHide":"JS Plugin Hide",
	"Pref_ReferHeader":"Referer Controller",
	"Pref_ScreenRes":"Screen Resolution Tracking",
	"Pref_UserAgent":"User-Agent Randomiser",
	"Pref_WebGLFingerprint":"WebGL Fingerprinting Protection",
	"Pref_WebRTC":"WebRTC Protection"
};

// Trace whitelist template
var ProtectionTemplate = function(defaults){
	return {
		PresetLevel:null,
		SiteBlocked:false,
		InitRequests:true,
		Protections:{
			Pref_AudioFingerprint:defaults,
			Pref_BatteryApi:defaults,
			Pref_CanvasFingerprint: defaults,
			Pref_ClientRects:defaults,
			Pref_CommonTracking:defaults,
			Pref_CookieEater:defaults,
			Pref_ETagTrack:defaults,
			Pref_GoogleHeader:defaults,
			Pref_IPSpoof:defaults,
			Pref_NativeFunctions:defaults,
			Pref_NetworkInformation:defaults,
			Pref_HardwareSpoof:defaults,
			Pref_PingBlock:defaults,
			Pref_PluginHide:defaults,
			Pref_ReferHeader:defaults,
			Pref_ScreenRes:defaults,
			Pref_UserAgent:defaults,
			Pref_WebRTC:defaults,
			Pref_WebGLFingerprint:defaults
		}
	};
};