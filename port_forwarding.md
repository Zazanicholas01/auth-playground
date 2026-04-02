### DBGate

```bash
kubectl -n iot-playground port-forward svc/dbgate 3000:3000
```

### Live SQL client on Timescale

```bash
kubectl -n iot-playground exec -it statefulset/iot-timescaledb -- \
  psql -U iot_app -d iot_playground
```

### Force DB Recreation

```bash
kubectl -n iot-playground delete statefulset iot-timescaledb
kubectl -n iot-playground delete pvc iot-timescaledb-data
```

## Local Port Forwarding and Dev Server Commands


### 1. Start Port Forwards

```bash
kubectl -n iot-playground port-forward svc/iot-timescaledb 5432:5432
kubectl -n iot-playground port-forward svc/emqx-listeners 1884:1883
```

### 2. Run Local API

```bash
manifests/emqx-iot/simulator/local_ui_dev/run-local-api.sh
```

### 3. Run Local UI
```bash
IOT_UPSTREAM_BASE=http://127.0.0.1:8080 manifests/emqx-iot/simulator/local_ui_dev/run-local-ui.sh
```
