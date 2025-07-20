const moodInput = document.getElementById('moodInput');
const findSoundBtn = document.getElementById('findSoundBtn');
const audioControls = document.getElementById('audioControls');
const playPauseBtn = document.getElementById('playPauseBtn');
const volumeSlider = document.getElementById('volumeSlider');
const playerStatus = document.getElementById('playerStatus');

// Tempo seçimi alanı
const tempoDiv = document.createElement('div');
tempoDiv.id = 'tempoDiv';
tempoDiv.style.marginTop = '10px';

const tempoLabel = document.createElement('label');
tempoLabel.textContent = 'Müzik temposunu seç: ';
tempoLabel.htmlFor = 'tempoSelect';

const tempoSelect = document.createElement('select');
tempoSelect.id = 'tempoSelect';

['yavas', 'hizli'].forEach(tempo => {
  const option = document.createElement('option');
  option.value = tempo;
  option.text = tempo === 'yavas' ? 'Yavaş' : 'Hızlı';
  tempoSelect.appendChild(option);
});

const tempoConfirmBtn = document.createElement('button');
tempoConfirmBtn.textContent = 'Onayla';

tempoDiv.appendChild(tempoLabel);
tempoDiv.appendChild(tempoSelect);
tempoDiv.appendChild(tempoConfirmBtn);
tempoDiv.style.display = 'none';
document.querySelector('.prompt-window').appendChild(tempoDiv);

// Geri bildirim formu
const feedbackDiv = document.createElement('div');
feedbackDiv.id = 'feedbackDiv';
feedbackDiv.style.marginTop = '10px';

const feedbackLabel = document.createElement('label');
feedbackLabel.textContent = 'Eğer tahmin yanlışsa doğru ruh halini seç ve Gönder: ';
feedbackLabel.htmlFor = 'feedbackSelect';

const feedbackSelect = document.createElement('select');
feedbackSelect.id = 'feedbackSelect';

['mutlu', 'huzunlu', 'sakin'].forEach(mood => {
  const option = document.createElement('option');
  option.value = mood;
  option.text = mood.charAt(0).toUpperCase() + mood.slice(1);
  feedbackSelect.appendChild(option);
});

const feedbackButton = document.createElement('button');
feedbackButton.textContent = 'Gönder';

feedbackDiv.appendChild(feedbackLabel);
feedbackDiv.appendChild(feedbackSelect);
feedbackDiv.appendChild(feedbackButton);
feedbackDiv.style.display = 'none';
document.querySelector('.prompt-window').appendChild(feedbackDiv);

// Ruh hali ve tempoya göre müzik URL'leri
const moodKeywords = {
  mutlu: {
    yavas: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    hizli: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  },
  huzunlu: {
    yavas: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    hizli: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
  },
  sakin: {
    yavas: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
    hizli: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3',
  }
};

let audio = null;
let isPlaying = false;
let currentMood = null;
let currentInput = null;

// Ruh hali analiz butonu
findSoundBtn.addEventListener('click', () => {
  const inputText = moodInput.value.trim();
  currentInput = inputText;

  if (!inputText) {
    playerStatus.textContent = 'Lütfen ruh halinizi yazınız.';
    audioControls.style.display = 'none';
    feedbackDiv.style.display = 'none';
    tempoDiv.style.display = 'none';
    if (audio) {
      audio.pause();
      audio = null;
    }
    return;
  }

  fetch('http://localhost:5000/analiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: inputText }),
  })
    .then((response) => response.json())
    .then((data) => {
      currentMood = data.mood;
      playerStatus.textContent = `"${inputText}" için "${currentMood}" ruh hali belirlendi. Lütfen müzik temposunu seçin.`;
      tempoDiv.style.display = 'block';
      audioControls.style.display = 'none';
      feedbackDiv.style.display = 'none';
    })
    .catch(() => {
      playerStatus.textContent = 'Sunucu hatası oluştu.';
      feedbackDiv.style.display = 'none';
      tempoDiv.style.display = 'none';
    });
});

// Tempo seçildikten sonra müziği çal
tempoConfirmBtn.addEventListener('click', () => {
  const selectedTempo = tempoSelect.value || 'yavas';
  const musicUrl = moodKeywords[currentMood]?.[selectedTempo];

  if (musicUrl) {
    if (audio) {
      audio.pause();
      audio = null;
    }
    audio = new Audio(musicUrl);
    audio.volume = volumeSlider.value || 0.5;
    audio.play();
    isPlaying = true;
    playerStatus.textContent = `"${currentInput}" için "${currentMood}" ruh haline uygun ${selectedTempo === 'yavas' ? 'yavaş' : 'hızlı'} müzik çalıyor.`;
    audioControls.style.display = 'flex';
    playPauseBtn.textContent = '❚❚';
    feedbackDiv.style.display = 'block';
  } else {
    playerStatus.textContent = `"${currentMood}" için uygun müzik bulunamadı.`;
    audioControls.style.display = 'none';
    feedbackDiv.style.display = 'none';
    if (audio) {
      audio.pause();
      audio = null;
    }
  }
});

// Müzik kontrol
playPauseBtn.addEventListener('click', () => {
  if (!audio) return;

  if (isPlaying) {
    audio.pause();
    isPlaying = false;
    playPauseBtn.textContent = '►';
    playerStatus.textContent = 'Müzik duraklatıldı.';
  } else {
    audio.play();
    isPlaying = true;
    playPauseBtn.textContent = '❚❚';
    playerStatus.textContent = 'Müzik çalıyor...';
  }
});

volumeSlider.addEventListener('input', () => {
  if (audio) {
    audio.volume = volumeSlider.value;
  }
});

// Geri bildirim gönder
feedbackButton.addEventListener('click', () => {
  const correctMood = feedbackSelect.value;

  fetch('http://localhost:5000/ogren', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: currentInput, correct_mood: correctMood }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.status === 'success') {
        playerStatus.textContent = 'Model güncellendi, teşekkürler! Yeni müzik çalınıyor...';
        feedbackDiv.style.display = 'none';

        // 🌟 MÜZİĞİ DEĞİŞTİR:
        const selectedTempo = tempoSelect.value || 'yavas';
        const newMusicUrl = moodKeywords[correctMood]?.[selectedTempo];

        if (newMusicUrl) {
          if (audio) {
            audio.pause();
            audio = null;
          }
          audio = new Audio(newMusicUrl);
          audio.volume = volumeSlider.value || 0.5;
          audio.play();
          isPlaying = true;
          playPauseBtn.textContent = '❚❚';
          audioControls.style.display = 'flex';
        } else {
          playerStatus.textContent = `"${correctMood}" için uygun müzik bulunamadı.`;
        }
      } else {
        playerStatus.textContent = 'Güncelleme başarısız.';
      }
    })
    .catch(() => {
      playerStatus.textContent = 'Sunucu hatası.';
    });
});
