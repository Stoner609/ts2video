function logevent(event) {
  console.log(event);
}

// fetch("./video/happy.ts", {
fetch("./video/avegers1.ts", {
  // set header
})
  .then(function(response) {
    return response.arrayBuffer();
  })
  .then(function(arrayBuffer) {
    console.log(arrayBuffer);
    // data events signal a new fMP4 segment is ready:
    transferFormat(arrayBuffer);
  });

function transferFormat(data) {
  // 將數據從ArrayBuffer格式保存為可操作的Unit8Array格式
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer
  var segment = new Uint8Array(data);

  // 接收無音頻ts文件，OutputType設為'video'，带音頻ts設'combined'
  var combined = false;
  var outputType = "video";

  var remuxedSegments = [];
  var remuxedBytesLength = 0;
  var remuxedInitSegment = null;

  // remux選項默認為 true，將數據的音頻視頻混合為 mp4，設為 false 則不混合
  var transmuxer = new muxjs.mp4.Transmuxer({ remux: false });

  // 監聽 data 事件，開始轉換流
  transmuxer.on("data", function(event) {
    console.log("data", event);
    if (event.type === outputType) {
      remuxedSegments.push(event);
      remuxedBytesLength += event.data.byteLength;
      remuxedInitSegment = event.initSegment;
    }
  });

  // 監聽轉換完成事件，拼接最後結果並傳入 MediaSource
  transmuxer.on("done", function() {
    console.log("done");
    var offset = 0;
    var bytes = new Uint8Array(
      remuxedInitSegment.byteLength + remuxedBytesLength
    );
    bytes.set(remuxedInitSegment, offset);
    offset += remuxedInitSegment.byteLength;

    for (var j = 0, i = offset; j < remuxedSegments.length; j++) {
      bytes.set(remuxedSegments[j].data, i);
      i += remuxedSegments[j].byteLength;
    }
    remuxedSegments = [];
    remuxedBytesLength = 0;
    // 解析出轉換後的 mp4 相關訊息，與最終轉換結果無關
    vjsParsed = muxjs.mp4.tools.inspect(bytes);
    console.log("transmuxed", vjsParsed);

    prepareSourceBuffer(combined, outputType, bytes);
  });
  // push 方法可能會觸發 'data' 事件，因此要在事件註冊完成後調用
  transmuxer.push(segment); // 傳入二進制數據，分割為 m2ts 包，依次調用
  // flush 的調用會直接觸發 'done' 事件，因此要事件註冊完成後調用
  transmuxer.flush(); // 将所有数据从缓存区清出来
}

function prepareSourceBuffer(combined, outputType, bytes) {
  var buffer;

  video = $("#ts-video")[0];
  video.controls = true;
  // MediaSource Web API: https://developer.mozilla.org/zh-CN/docs/Web/API/MediaSource
  mediaSource = new MediaSource();
  video.src = URL.createObjectURL(mediaSource);

  // 轉換後 mp4 的音頻格式 視頻格式
  var codecsArray = ["avc1.64001f", "mp4a.40.5"];

  mediaSource.addEventListener("sourceopen", function() {
    // MediaSource 實例默認的 duration 属性為 NaN
    mediaSource.duration = 0;
    // 轉換為带音頻、視頻的 mp4
    if (combined) {
      buffer = mediaSource.addSourceBuffer(
        'video/mp4;codecs="' + "avc1.64001f,mp4a.40.5" + '"'
      );
    } else if (outputType === "video") {
      // 轉換為只含視頻的mp4
      buffer = mediaSource.addSourceBuffer(
        'video/mp4;codecs="' + codecsArray[0] + '"'
      );
    } else if (outputType === "audio") {
      // 轉換為只含音頻的mp4
      buffer = mediaSource.addSourceBuffer(
        'audio/mp4;codecs="' + (codecsArray[1] || codecsArray[0]) + '"'
      );
    }

    buffer.addEventListener("updatestart", logevent);
    buffer.addEventListener("updateend", logevent);
    buffer.addEventListener("error", logevent);
    video.addEventListener("error", logevent);
    // mp4 buffer 準備完，傳入轉換後的數據
    // 將 bytes 放入 MediaSource 創建的 sourceBuffer 中
    // https://developer.mozilla.org/en-US/docs/Web/API/SourceBuffer/appendBuffer
    buffer.appendBuffer(bytes);
    
    // 自動播放
    // video.play();
  });
}

// 手動播放
$("#play").on("click", function() {
  $("#ts-video")[0].play();
});
