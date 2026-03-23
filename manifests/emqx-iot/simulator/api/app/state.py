from dataclasses import dataclass, field


@dataclass
class ApiState:
    devices: dict = field(default_factory=dict)
    events: list = field(default_factory=list)
    history: dict = field(default_factory=dict)