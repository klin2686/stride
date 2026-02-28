#include "Arduino_RouterBridge.h"
#include "Modulino.h"

ModulinoMovement movement;

struct __attribute__((packed)) IMUSample {
    uint32_t timestamp_ms;
    float ax, ay, az;
    float gx, gy, gz;
};

static const int BUFFER_CAPACITY = 100;
static const unsigned long SAMPLE_INTERVAL_US = 5000;  // 5 ms → 200 Hz

IMUSample ringBuffer[BUFFER_CAPACITY];
volatile int head = 0;
volatile int tail = 0;
unsigned long lastSampleMicros = 0;

static const char HEX_LUT[] = "0123456789ABCDEF";
static char hexBuf[BUFFER_CAPACITY * sizeof(IMUSample) * 2 + 1];

String getBuffer();

void setup() {
    Bridge.begin();
    Modulino.begin();
    movement.begin();

    Bridge.provide("get_buffer", getBuffer);
}

void loop() {
    unsigned long now = micros();
    if (now - lastSampleMicros < SAMPLE_INTERVAL_US) return;
    lastSampleMicros = now;

    if (!movement.available()) return;
    movement.update();

    IMUSample s;
    s.timestamp_ms = millis();
    s.ax = movement.getX();
    s.ay = movement.getY();
    s.az = movement.getZ();
    s.gx = movement.getRoll();
    s.gy = movement.getPitch();
    s.gz = movement.getYaw();

    noInterrupts();
    ringBuffer[head] = s;
    int nextHead = (head + 1) % BUFFER_CAPACITY;
    if (nextHead == tail) {
        tail = (tail + 1) % BUFFER_CAPACITY;
    }
    head = nextHead;
    interrupts();
}

String getBuffer() {
    noInterrupts();
    int snapTail = tail;
    int snapHead = head;
    tail = head;
    interrupts();

    int n = (snapHead - snapTail + BUFFER_CAPACITY) % BUFFER_CAPACITY;
    if (n == 0) return "";

    const int sampleBytes = sizeof(IMUSample);
    int pos = 0;

    for (int i = 0; i < n; i++) {
        int idx = (snapTail + i) % BUFFER_CAPACITY;
        uint8_t* raw = (uint8_t*)&ringBuffer[idx];
        for (int b = 0; b < sampleBytes; b++) {
            hexBuf[pos++] = HEX_LUT[raw[b] >> 4];
            hexBuf[pos++] = HEX_LUT[raw[b] & 0x0F];
        }
    }
    hexBuf[pos] = '\0';

    return String(hexBuf);
}
